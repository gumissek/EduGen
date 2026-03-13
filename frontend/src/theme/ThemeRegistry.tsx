'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useColorMode } from './ColorModeContext';
import { lightTheme, darkTheme } from './theme';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const { mode } = useColorMode();

  const [{ cache, flush }] = React.useState(() => {
    const c = createCache({ key: 'css', prepend: true });
    c.compat = true;
    const prevInsert = c.insert.bind(c);
    let inserted: string[] = [];
    c.insert = function insert(selector, serialized, sheet, shouldCache) {
      if (c.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(selector, serialized, sheet, shouldCache);
    };
    return {
      cache: c,
      flush: () => {
        const prev = inserted;
        inserted = [];
        return prev;
      },
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  const theme = React.useMemo(
    () => (mode === 'light' ? lightTheme : darkTheme),
    [mode]
  );

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}
