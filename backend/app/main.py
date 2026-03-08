from __future__ import annotations

import io
import json
import random
import zipfile
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_session_expiry, encrypt_text, generate_token, generate_uuid, now_utc, verify_password
from app.db.init_db import init_db
from app.db.models import (
    Backup,
    Document,
    Generation,
    GenerationSourceFile,
    Prototype,
    Session as UserSession,
    SettingsModel,
    SourceFile,
    Subject,
    User,
)
from app.db.session import get_db
from app.schemas import (
    BackupOut,
    BulkDownloadRequest,
    FinalizeResponse,
    GenerationParams,
    GenerationResponse,
    GenerationStatusResponse,
    LoginRequest,
    LoginResponse,
    PrototypeOut,
    PrototypeUpdate,
    RepromptRequest,
    SettingsResponse,
    SettingsUpdate,
    SourceFileOut,
    SubjectCreate,
    SubjectOut,
)
from app.services.ai import generate_prototype, summarize_with_llm, transcribe_image_with_vision
from app.services.backup import create_backup
from app.services.diagnostics import log_event
from app.services.files import (
    build_docx_buffer,
    detect_file_type,
    extract_docx_text,
    extract_image_bytes,
    extract_pdf_text,
    one_sentence_summary,
    save_upload,
)

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post(f"{settings.api_prefix}/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło")

    session = UserSession(
        id=generate_uuid(),
        user_id=user.id,
        token=generate_token(),
        expires_at=create_session_expiry(),
        last_activity_at=now_utc(),
    )
    user.last_login_at = now_utc()
    db.add(session)
    db.commit()
    log_event(db, "info", "User login successful")
    return LoginResponse(token=session.token, expires_at=session.expires_at)


@app.post(f"{settings.api_prefix}/auth/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    return {"ok": True}


@app.get(f"{settings.api_prefix}/settings", response_model=SettingsResponse)
def get_settings(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(SettingsModel).first()
    return SettingsResponse(default_model=row.default_model, has_api_key=bool(row.openai_api_key_encrypted))


@app.put(f"{settings.api_prefix}/settings")
def update_settings(
    payload: SettingsUpdate,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(SettingsModel).first()
    row.default_model = payload.default_model
    if payload.openai_api_key is not None and payload.openai_api_key.strip():
        row.openai_api_key_encrypted = encrypt_text(payload.openai_api_key.strip())
    db.commit()
    return {"ok": True}


@app.get(f"{settings.api_prefix}/subjects", response_model=list[SubjectOut])
def list_subjects(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Subject).order_by(Subject.name.asc()).all()
    return [SubjectOut(id=s.id, name=s.name, is_custom=s.is_custom) for s in rows]


@app.post(f"{settings.api_prefix}/subjects", response_model=SubjectOut)
def create_subject(
    payload: SubjectCreate,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = Subject(id=generate_uuid(), name=payload.name.strip(), is_custom=True)
    db.add(subject)
    db.commit()
    return SubjectOut(id=subject.id, name=subject.name, is_custom=True)


@app.post(f"{settings.api_prefix}/files", response_model=SourceFileOut)
async def upload_file(
    subject_id: str,
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Nie znaleziono przedmiotu")

    file_id = generate_uuid()
    file_type = detect_file_type(file)
    extension = (file.filename or "").split(".")[-1].lower() or file_type
    target_path = Path(settings.data_dir) / "subjects" / subject_id / f"{file_id}.{extension}"
    file_size = await save_upload(file, target_path)

    extracted_text = ""
    page_count = None
    if file_type == "pdf":
        extracted_text, page_count = extract_pdf_text(target_path)
    elif file_type == "docx":
        extracted_text = extract_docx_text(target_path)
    elif file_type == "img":
        vision_text = transcribe_image_with_vision(db, extract_image_bytes(target_path))
        extracted_text = vision_text or ""

    if not extracted_text and file_type == "pdf":
        raise HTTPException(status_code=400, detail="Skan PDF bez warstwy tekstowej wymaga OCR Vision (MVP: brak konwersji PDF->IMG)")

    summary = summarize_with_llm(db, extracted_text[:8000]) or one_sentence_summary(extracted_text, file.filename or "plik")

    row = SourceFile(
        id=file_id,
        subject_id=subject_id,
        filename=file.filename or f"{file_id}.{extension}",
        original_path=str(target_path),
        file_type=file_type,
        file_size=file_size,
        extracted_text=extracted_text,
        summary=summary,
        page_count=page_count,
    )
    db.add(row)
    db.commit()

    return SourceFileOut(id=row.id, filename=row.filename, summary=row.summary, file_type=row.file_type, subject_id=row.subject_id)


@app.get(f"{settings.api_prefix}/files", response_model=list[SourceFileOut])
def list_files(
    subject_id: str | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(SourceFile).filter(SourceFile.deleted_at.is_(None))
    if subject_id:
        query = query.filter(SourceFile.subject_id == subject_id)
    rows = query.order_by(SourceFile.created_at.desc()).all()
    return [
        SourceFileOut(
            id=row.id,
            filename=row.filename,
            summary=row.summary,
            file_type=row.file_type,
            subject_id=row.subject_id,
        )
        for row in rows
    ]


def _generation_worker(generation_id: str) -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        generation = db.query(Generation).filter(Generation.id == generation_id).first()
        if not generation:
            return
        generation.status = "processing"
        db.commit()

        source_links = db.query(GenerationSourceFile).filter(GenerationSourceFile.generation_id == generation_id).all()
        source_ids = [link.source_file_id for link in source_links]
        source_files = db.query(SourceFile).filter(SourceFile.id.in_(source_ids)).all() if source_ids else []
        source_text = "\n\n".join([sf.extracted_text or "" for sf in source_files])

        model = db.query(SettingsModel).first().default_model
        prompt_text = (
            f"Jesteś ekspertem dydaktycznym. Wygeneruj materiał typu {generation.content_type}. "
            f"Poziom: {generation.education_level} {generation.class_level}, trudność: {generation.difficulty}. "
            f"Temat: {generation.topic}. Instrukcje: {generation.instructions or ''}. "
            f"Liczba pytań: {generation.total_questions}, otwarte: {generation.open_questions}, zamknięte: {generation.closed_questions}. "
            f"Źródła:\n{source_text[:14000]}"
        )
        content, answer_key = generate_prototype(
            db=db,
            generation_id=generation_id,
            model=model,
            prompt_text=prompt_text,
            fallback_questions=max(generation.total_questions, 3),
        )
        prototype = Prototype(
            id=generate_uuid(),
            generation_id=generation_id,
            original_content=content,
            edited_content=None,
            answer_key=answer_key,
        )
        db.add(prototype)
        generation.status = "ready"
        db.commit()
    except Exception as exc:
        generation = db.query(Generation).filter(Generation.id == generation_id).first()
        if generation:
            generation.status = "failed"
            db.commit()
        log_event(db, "error", "Generation failed", {"generation_id": generation_id, "error": str(exc)})
    finally:
        db.close()


@app.post(f"{settings.api_prefix}/generations", response_model=GenerationResponse)
def create_generation(
    payload: GenerationParams,
    background_tasks: BackgroundTasks,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.content_type in {"exam", "quiz", "test"} and payload.total_questions != payload.open_questions + payload.closed_questions:
        raise HTTPException(status_code=400, detail="Suma pytań musi równać się open+closed")

    generation = Generation(
        id=generate_uuid(),
        subject_id=payload.subject_id,
        content_type=payload.content_type,
        education_level=payload.education_level,
        class_level=payload.class_level,
        language_level=payload.language_level,
        topic=payload.topic,
        instructions=payload.instructions,
        difficulty=payload.difficulty,
        total_questions=payload.total_questions,
        open_questions=payload.open_questions,
        closed_questions=payload.closed_questions,
        variants_count=payload.variants_count,
        status="draft",
    )
    db.add(generation)
    db.flush()
    for source_file_id in payload.source_file_ids:
        db.add(GenerationSourceFile(generation_id=generation.id, source_file_id=source_file_id))
    db.commit()

    background_tasks.add_task(_generation_worker, generation.id)
    return GenerationResponse(id=generation.id, status="processing")


@app.get(f"{settings.api_prefix}/generations/{{id}}", response_model=GenerationStatusResponse)
def generation_status(
    id: str,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Generation).filter(Generation.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Brak generowania")
    return GenerationStatusResponse(id=row.id, status=row.status)


@app.get(f"{settings.api_prefix}/prototypes/{{generation_id}}", response_model=PrototypeOut)
def get_prototype(
    generation_id: str,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Brak prototypu")
    return PrototypeOut(original_content=row.original_content, edited_content=row.edited_content, answer_key=row.answer_key)


@app.put(f"{settings.api_prefix}/prototypes/{{generation_id}}")
def update_prototype(
    generation_id: str,
    payload: PrototypeUpdate,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Brak prototypu")
    row.edited_content = payload.edited_content
    db.commit()
    return {"ok": True}


@app.post(f"{settings.api_prefix}/prototypes/{{generation_id}}/reprompt")
def reprompt_prototype(
    generation_id: str,
    payload: RepromptRequest,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Prototype).filter(Prototype.generation_id == generation_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Brak prototypu")
    row.edited_content = (row.edited_content or row.original_content) + "\n\n[Uwagi nauczyciela]\n" + payload.prompt
    db.commit()
    return {"ok": True}


@app.post(f"{settings.api_prefix}/generations/{{id}}/finalize", response_model=FinalizeResponse)
def finalize_generation(
    id: str,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    generation = db.query(Generation).filter(Generation.id == id).first()
    prototype = db.query(Prototype).filter(Prototype.generation_id == id).first()
    if not generation or not prototype:
        raise HTTPException(status_code=404, detail="Brak danych do finalizacji")

    base_lines = [ln for ln in (prototype.edited_content or prototype.original_content).split("\n") if ln.strip()]
    all_groups: list[str] = []
    for index in range(generation.variants_count):
        group_lines = base_lines[:]
        random.shuffle(group_lines)
        all_groups.append(f"Grupa {chr(ord('A') + index)}\n" + "\n".join(group_lines))

    full_content = "\n\n".join(all_groups)
    file_buffer = build_docx_buffer(full_content, prototype.answer_key)

    out_dir = Path(settings.data_dir) / "documents" / generation.subject_id / generation.content_type
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{generation.content_type}_{id}.docx"
    output_path = out_dir / filename
    output_path.write_bytes(file_buffer.getvalue())

    document = Document(
        id=generate_uuid(),
        generation_id=generation.id,
        filename=filename,
        file_path=str(output_path),
        variants_count=generation.variants_count,
    )
    generation.status = "finalized"
    db.add(document)
    db.commit()
    return FinalizeResponse(status="processing", document_id=document.id)


@app.get(f"{settings.api_prefix}/documents")
def list_documents(
    page: int = 1,
    page_size: int = 20,
    query: str | None = None,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Document).filter(Document.deleted_at.is_(None))
    if query:
        q = q.filter(Document.filename.ilike(f"%{query}%"))
    total = q.count()
    rows = (
        q.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "items": [
            {
                "id": row.id,
                "filename": row.filename,
                "created_at": row.created_at,
                "variants_count": row.variants_count,
            }
            for row in rows
        ],
    }


@app.get(f"{settings.api_prefix}/documents/{{id}}/download")
def download_document(
    id: str,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Document).filter(Document.id == id, Document.deleted_at.is_(None)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Brak dokumentu")
    return FileResponse(path=row.file_path, filename=row.filename, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@app.post(f"{settings.api_prefix}/documents/bulk-download")
def bulk_download(
    payload: BulkDownloadRequest,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Document).filter(Document.id.in_(payload.document_ids), Document.deleted_at.is_(None)).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Brak dokumentów")

    stream = io.BytesIO()
    with zipfile.ZipFile(stream, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for row in rows:
            file_path = Path(row.file_path)
            if file_path.exists():
                zf.write(file_path, arcname=row.filename)
    stream.seek(0)
    return StreamingResponse(stream, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=documents.zip"})


@app.post(f"{settings.api_prefix}/backups", response_model=BackupOut)
def manual_backup(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    backup = create_backup(db)
    return BackupOut(id=backup.id, backup_path=backup.backup_path, created_at=backup.created_at, expires_at=backup.expires_at)


@app.get(f"{settings.api_prefix}/backups", response_model=list[BackupOut])
def list_backups(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Backup).order_by(Backup.created_at.desc()).all()
    return [BackupOut(id=b.id, backup_path=b.backup_path, created_at=b.created_at, expires_at=b.expires_at) for b in rows]


@app.post(f"{settings.api_prefix}/backups/restore")
def restore_backup(
    backup_id: str,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Brak backupu")

    db_path = Path(settings.database_url.replace("sqlite:///", ""))
    with zipfile.ZipFile(backup.backup_path, "r") as zf:
        names = zf.namelist()
        if not names:
            raise HTTPException(status_code=400, detail="Backup pusty")
        with zf.open(names[0], "r") as src, db_path.open("wb") as dest:
            dest.write(src.read())
    return {"ok": True}


@app.get(f"{settings.api_prefix}/diagnostics")
def diagnostics(
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.db.models import DiagnosticLog

    rows = db.query(DiagnosticLog).order_by(DiagnosticLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": r.id,
            "level": r.level,
            "message": r.message,
            "metadata": json.loads(r.metadata_json or "{}"),
            "created_at": r.created_at,
        }
        for r in rows
    ]
