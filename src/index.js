"use strict";

/**
 * Public entry point for the simple-string-interpolation package.
 *
 * Keeping the re-export surface tiny makes it obvious which names are
 * part of the supported API and which are implementation details.
 */
export { parseTemplate, InterpolationError } from "./core.js";
