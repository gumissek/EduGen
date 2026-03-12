import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid2 from '@mui/material/Grid2';

export default function Home() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, mb: 4 }}>
        <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 800, mb: 2 }}>
          EduGen
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Aplikacja pomaga nauczycielom szybko tworzyć materiały edukacyjne z użyciem AI, edytować je i eksportować do dokumentów.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button component="a" href="/login" variant="contained">Zaloguj się</Button>
          <Button component="a" href="/register" variant="outlined">Załóż konto</Button>
          <Button component="a" href="/about" variant="text">O nas</Button>
        </Stack>
      </Paper>

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Sekcja tekstowa</Typography>
            <Typography color="text.secondary">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Lorem ipsum dolor sit amet.</Typography>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Sekcja obrazów</Typography>
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Placeholder obrazka
            </Box>
          </Paper>
        </Grid2>
        <Grid2 size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Sekcja wideo</Typography>
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 5, textAlign: 'center', color: 'text.secondary' }}>
              Placeholder wideo
            </Box>
          </Paper>
        </Grid2>
      </Grid2>

      <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Przyszłe podstrony</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button disabled variant="outlined">Funkcja 1 (wkrótce)</Button>
          <Button disabled variant="outlined">Funkcja 2 (wkrótce)</Button>
          <Button disabled variant="outlined">Funkcja 3 (wkrótce)</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
