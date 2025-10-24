import type { Metadata } from "next";
import "./globals.css";
import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";

import classNames from "classnames";
import {
  Column,
  IconProvider,
  ToastProvider,
  ThemeProvider,
  DataThemeProvider,
  LayoutProvider,
} from "@once-ui-system/core";

import { fonts } from "../resources/once-ui.config";

export const metadata: Metadata = {
  title: "연합인포맥스 히오스 동호회",
  description:
    "연합인포맥스 히어로즈 오브 더 스톰 동호회 - 함께 즐기는 커뮤니티",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <Column
        as="html"
        lang="ko"
        suppressHydrationWarning
        className={classNames(
          fonts.heading.variable,
          fonts.body.variable,
          fonts.label.variable,
          fonts.code.variable
        )}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    const root = document.documentElement;
                    
                    const defaultTheme = 'system';
                    root.setAttribute('data-neutral', 'gray');
                    root.setAttribute('data-brand', 'blue');
                    root.setAttribute('data-accent', 'indigo');
                    root.setAttribute('data-solid', 'contrast');
                    root.setAttribute('data-solid-style', 'flat');
                    root.setAttribute('data-border', 'playful');
                    root.setAttribute('data-surface', 'filled');
                    root.setAttribute('data-transition', 'all');
                    root.setAttribute('data-scaling', '100');
                    root.setAttribute('data-viz-style', 'categorical');
                    
                    const resolveTheme = (themeValue) => {
                      if (!themeValue || themeValue === 'system') {
                        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                      }
                      return themeValue;
                    };
                    
                    const theme = localStorage.getItem('data-theme');
                    const resolvedTheme = resolveTheme(theme);
                    root.setAttribute('data-theme', resolvedTheme);
                    
                    const styleKeys = ['neutral', 'brand', 'accent', 'solid', 'solid-style', 'viz-style', 'border', 'surface', 'transition', 'scaling'];
                    styleKeys.forEach(key => {
                      const value = localStorage.getItem('data-' + key);
                      if (value) {
                        root.setAttribute('data-' + key, value);
                      }
                    });
                  } catch (e) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                })();
              `,
            }}
          />
        </head>
        <LayoutProvider>
          <ThemeProvider>
            <DataThemeProvider>
              <ToastProvider>
                <IconProvider>
                  <Column
                    background="page"
                    as="body"
                    fillWidth
                    margin="0"
                    padding="0"
                    style={{ minHeight: "100vh" }}
                  >
                    {children}
                  </Column>
                </IconProvider>
              </ToastProvider>
            </DataThemeProvider>
          </ThemeProvider>
        </LayoutProvider>
      </Column>
    </>
  );
}
