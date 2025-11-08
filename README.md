# PixelMuse

![alt text](pixelmuse/public/logo.png)

[![Vite](https://img.shields.io/badge/built%20with-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![React](https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/) [![Tailwind CSS](https://img.shields.io/badge/styles-Tailwind%20CSS-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![License](https://img.shields.io/github/license/Gerard-Devlin/PixelMuse?style=flat-square)](LICENSE) [![Deploy](https://img.shields.io/github/deployments/Gerard-Devlin/PixelMuse/github-pages?label=gh-pages&style=flat-square)](https://gerard-devlin.github.io/PixelMuse/)

Turn sketches or reference images into clean ASCII artwork directly in the browser.

## Features

-   Drawing canvas with brush, eraser, and image import support (mouse + touch)
-   Live ASCII preview with columns, density, line-height, and charset presets
-   Export helpers for TXT and HTML (monochrome and color) plus clipboard shortcuts
-   Friendly onboarding dialog and responsive layout powered by shadcn/ui + Tailwind
-   Optimized canvas + ASCII pipeline (batched redraws, cached contexts)

## Quick Start

```bash
git clone https://github.com/Gerard-Devlin/PixelMuse.git
cd PixelMuse/pixelmuse
npm install
npm run dev      # start Vite dev server
```

### Production

```bash
npm run build    # generate dist/
npm run deploy   # publish to GitHub Pages (gh-pages)
```

## Tech Stack

-   React 18 + Vite
-   Tailwind CSS + shadcn/ui components
-   Lucide icons
-   gh-pages for static deployment

## Performance Notes

-   Canvas contexts are cached and resize work is throttled via requestAnimationFrame
-   ASCII conversion uses array buffers instead of repeated string concatenation
-   Dialogs and previews share responsive sizing logic for smoother mobile rendering

Open the app, upload or sketch, tweak the sliders, and share ASCII art in seconds.
