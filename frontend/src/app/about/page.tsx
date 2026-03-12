import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

const team = [
  { name: 'Piotr Biliński', role: 'Product Owner + Fullstack Developer' },
];

export default function AboutPage() {
  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          O nas
        </Typography>
        <Typography color="text.secondary">
          EduGen to projekt wspierający nauczycieli w szybkim tworzeniu materiałów dydaktycznych z pomocą modeli AI.
          Ten widok zawiera mock danych i będzie rozwijany o pełne informacje o zespole oraz misji produktu.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Zespół (mock)
        </Typography>
        <Stack spacing={1.25}>
          {team.map((member) => (
            <Typography key={member.name}>
              • {member.name} — {member.role}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
