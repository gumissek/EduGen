import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid2 from '@mui/material/Grid2';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolIcon from '@mui/icons-material/School';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export default function Home() {
  return (
    <Box sx={{ maxWidth: 1160, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 5 },
          mb: 4,
          borderRadius: 4,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box>
            <Chip icon={<AutoAwesomeIcon />} label="EduGen" color="primary" variant="outlined" sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
              Twórz materiały edukacyjne szybciej z AI
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
              EduGen wspiera nauczycieli w generowaniu testów, kart pracy i quizów na podstawie własnych materiałów, z pełną edycją i eksportem do dokumentów.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component="a" href="/login" variant="contained">Zaloguj się</Button>
              <Button component="a" href="/register" variant="outlined">Załóż konto</Button>
              <Button component="a" href="/about" variant="text">O nas</Button>
            </Stack>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              minWidth: { xs: '100%', md: 280 },
              borderRadius: 3,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Co zyskujesz?
            </Typography>
            <Stack spacing={1.2}>
              <Typography variant="body2" color="text.secondary">• Generowanie materiałów przez AI</Typography>
              <Typography variant="body2" color="text.secondary">• Edytor wersji roboczych</Typography>
              <Typography variant="body2" color="text.secondary">• Eksport gotowych dokumentów</Typography>
            </Stack>
          </Paper>
        </Stack>
      </Paper>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12 }}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(1,72,131,0.08), rgba(1,72,131,0.03))',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Box>
                <Stack direction="row" spacing={1.1} alignItems="center" sx={{ mb: 1 }}>
                  <MenuBookIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Podstawa Programowa
                  </Typography>
                </Stack>
                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                  Przejrzyj oficjalne dokumenty MEN wykorzystywane przez EduGen do sprawdzania zgodności
                  generowanych materiałów. W jednym miejscu zobaczysz listę źródeł i pobierzesz pliki PDF.
                </Typography>
              </Box>
              <Button component="a" href="/state-documents/pp" variant="contained" sx={{ whiteSpace: 'nowrap' }}>
                Podstawa Programowa
              </Button>
            </Stack>
          </Paper>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sekcja tekstowa</Typography>
            </Stack>
            <Typography color="text.secondary">
              Miejsce na treści informacyjne o produkcie, onboarding użytkownika i przykładowe scenariusze użycia.
            </Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Sekcja obrazów</Typography>
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Placeholder obrazka
            </Box>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <DescriptionIcon color="secondary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sekcja wideo</Typography>
            </Stack>
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 5, textAlign: 'center', color: 'text.secondary' }}>
              Placeholder wideo
            </Box>
          </Paper>
        </Grid2>
      </Grid2>

      <Paper variant="outlined" sx={{ p: 3, mt: 4, borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Przyszłe podstrony</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button disabled variant="outlined">Funkcja 1 (wkrótce)</Button>
          <Button disabled variant="outlined">Funkcja 2 (wkrótce)</Button>
          <Button disabled variant="outlined">Funkcja 3 (wkrótce)</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
