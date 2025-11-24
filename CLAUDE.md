# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React 19 + TypeScript + Vite web application with the React Compiler enabled for automatic optimization.

## Development Commands

- `npm run dev` - Start development server with HMR
- `npm run build` - Type check with TypeScript and build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Architecture

- **Build Tool**: Vite 7 with `@vitejs/plugin-react`
- **React Compiler**: Enabled via `babel-plugin-react-compiler` in vite.config.ts - provides automatic memoization (may impact dev/build performance)
- **Entry Point**: `src/main.tsx` renders `App` component into DOM
- **Styling**: CSS files imported directly into components (`App.css`, `index.css`)

## Tech Stack

- React 19
- TypeScript 5.9
- Vite 7
- ESLint 9 with TypeScript and React hooks plugins
