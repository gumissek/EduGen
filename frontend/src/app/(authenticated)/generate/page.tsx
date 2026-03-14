"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import GenerationWizard from "@/components/generate/GenerationWizard";

export default function GeneratePage() {
  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: "auto",
        // Zmniejszamy padding na telefonach, aby dać więcej miejsca komponentowi
        p: { xs: 1.5, sm: 2, md: 0 },
        // Kluczowe zabezpieczenia przed poziomym przewijaniem
        width: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Typography
        variant="h4"
        fontWeight="bold"
        gutterBottom
        sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}
      >
        Kreator materiałów
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: { xs: 3, sm: 4 } }}
      >
        Skonfiguruj parametry, aby wygenerować dopasowany materiał edukacyjny.
      </Typography>

      <GenerationWizard />
    </Box>
  );
}
