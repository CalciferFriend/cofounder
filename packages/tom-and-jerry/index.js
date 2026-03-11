#!/usr/bin/env node
/**
 * tom-and-jerry — user-facing entry point
 *
 * This thin wrapper re-exports the @tom-and-jerry/cli binary so that:
 *   npx tom-and-jerry          → runs the wizard (or shows status if configured)
 *   npx tom-and-jerry onboard  → explicit wizard
 *   npx tom-and-jerry status   → connectivity status
 *   npx tom-and-jerry send "do X" → delegate task to peer
 *
 * All real logic lives in @tom-and-jerry/cli.
 */
import "@tom-and-jerry/cli";
