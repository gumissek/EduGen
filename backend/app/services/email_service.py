"""Email service — stub for sending verification emails.

This service is prepared for future integration with a real email provider
(e.g. SMTP, SendGrid, Mailgun). While the application runs locally, emails
are NOT actually sent — instead the details are logged to the console.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def send_email_change_verification(to_email: str, verification_link: str) -> bool:
    """Send an email-change verification link to the new email address.

    Returns True if the email was "sent" (stubbed). In production, this would
    use an actual email transport and return False on failure.
    """
    logger.info(
        "[EMAIL STUB] Email change verification email:\n"
        "  To: %s\n"
        "  Link: %s\n"
        "  (Email sending is disabled in local mode)",
        to_email,
        verification_link,
    )
    # TODO: Replace with real email sending when deployed
    # Example: smtp / SendGrid / Mailgun integration
    return True


def send_password_change_code(to_email: str, code: str) -> bool:
    """Send a password-change verification code to the user's current email.

    Returns True if the email was "sent" (stubbed). In production, this would
    use an actual email transport and return False on failure.
    """
    logger.info(
        "[EMAIL STUB] Password change verification code:\n"
        "  To: %s\n"
        "  Code: %s\n"
        "  (Email sending is disabled in local mode)",
        to_email,
        code,
    )
    # TODO: Replace with real email sending when deployed
    return True
