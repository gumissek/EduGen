import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import GroupIcon from '@mui/icons-material/Group';

const team = [
  { name: 'Piotr Biliński', role: 'Product Owner + Fullstack Developer' },
  { name: 'Arkadiusz Rak', role: 'Fullstack Developer' }
];

export default function AboutPage() {
  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 4, md: 6 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, mb: 3, borderRadius: 4 }}>
        <Chip icon={<GroupIcon />} label="Poznaj EduGen" color="primary" variant="outlined" sx={{ mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
          O nas
        </Typography>
        <Typography color="text.secondary">
          EduGen to projekt wspierający nauczycieli w szybkim tworzeniu materiałów dydaktycznych z pomocą modeli AI.
          Rozwijamy narzędzie, które łączy bezpieczeństwo danych z praktycznym workflow pracy nauczyciela.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Zespół
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={1.25}>
          {team.map((member) => (
            <Typography key={member.name} sx={{ lineHeight: 1.7 }}>
              • {member.name} — {member.role}
            </Typography>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
