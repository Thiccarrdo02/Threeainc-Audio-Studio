# ThreeZinc UI/UX Design System Guide

This document captures the core design language, color palette, typography, and layout specifications used across the ThreeZinc Monorepo. It is intended to be shared with website designers to ensure brand consistency on new pages and components.

## Typography
The application primarily relies on two standard sans-serif Google Fonts.

*   **Primary Font:** `Inter` (used for clean, highly readable body text and standard UI elements)
    *   Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)
*   **Secondary/Heading Font:** `Maven Pro` (used for distinct typographic accents and specific headers)
    *   Weights: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)

*Global Body Base Size:* `13px` with a line-height of `1.4`

---

## Core Brand Colors

The design language leans heavily into vibrant blues and energetic cyan accents.

| Role | Color Value (Hex) | CSS Variable |
| :--- | :--- | :--- |
| **Primary Theme** | `#3353FE` (Vibrant Blue) | `--theme-primary` |
| **Primary Hover** | `#1F4CEE` (Deep Blue) | `--theme-primary-hover` |
| **Primary Light/Bg**| `rgba(51, 83, 254, 0.08)` | `--theme-primary-light` |
| **Accent Theme** | `#32B7EE` (Bright Cyan) | `--theme-accent` |
| **Accent Hover** | `#41A7FE` (Light Blue) | `--theme-accent-hover` |

---

## Brand Gradients

Gradients are a key part of the visual identity, extensively used in buttons, active tab states, text fills, and backgrounds.

*   **Gradient Start:** `#1F4CEE` (Deep Blue)
*   **Gradient Mid:** `#41A7FE` (Light Blue)
*   **Gradient End:** `#32B7EE` (Bright Cyan)

**Common Gradient Applications:**
*   **Vertical Gradients:** Ramps from Start (top, 0%) to Mid (50%) to End (bottom, 100%).
*   **Horizontal Button Gradients:** Ramps from Start (left, 0%) to Mid (50%) to End (right, 100%).
*   **Button Hover State:** Emphasizes deeper blues: `#1F4CEE` (0%) to `#3353FE` (50%) to `#41A7FE` (100%), combined with a shadow: `0 4px 16px rgba(31, 76, 238, 0.35)`.

---

## Extended Palette

To support data visualizations, subtle states, and neutral areas, the application employs an extended palette:

*   **Deep Blue:** `#1F4CEE` (`--palette-blue-deep`)
*   **Vibrant Blue:** `#3353FE` (`--palette-blue-vibrant`)
*   **Medium Blue:** `#506EEE` (`--palette-blue-medium`)
*   **Light Blue:** `#41A7FE` (`--palette-blue-light`)
*   **Cyan:** `#32B7EE` (`--palette-cyan`)
*   **Soft Blue:** `#7C8EE3` (`--palette-soft-blue`)
*   **Periwinkle:** `#AAB9ED` (`--palette-periwinkle`)
*   **Pale Blue:** `#C3CDEC` (`--palette-light-blue`)
*   **Gray Blue:** `#DCDDE6` (`--palette-gray-blue`)
*   **Light Gray:** `#E6E5EC` (`--palette-light-gray`)

---

## Layout & Structural Elements

*   **Border Radius (`--radius`)**: `0.5rem` (8px). 
    *   Standard cards and larger elements use `0.5rem`.
    *   Medium elements (`rounded-md`) use `6px`.
    *   Small buttons or inputs (`rounded-sm`) use `4px`.
*   **Borders:** Most standard UI borders utilize muted grays (`hsl(0 0% 89.8%)` in light mode), while "Theme" borders use the Primary (`#3353FE`) or gradients.
*   **Dark Mode / Light Mode Data:**
    *   *Light Mode Card/Default Surface*: Pure White (`hsl(0 0% 100%)`)
    *   *Dark Mode Card/Default Surface*: Deep Gray/Black (`hsl(0 0% 3.9%)`)

## Tailwind Utilities
For web developers using this design system, standard tailwind classes have been mapped to these tokens:
*   `text-theme-primary`, `bg-theme-primary`, `border-theme-primary`
*   `text-theme-accent`, `bg-theme-accent`
*   `bg-theme-gradient`, `bg-theme-gradient-horizontal`, `bg-theme-gradient-button`
