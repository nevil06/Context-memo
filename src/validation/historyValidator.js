/**
 * History Validator
 * Validates factual claims in generated memory files against past session history
 */

/**
 * Validate factual claims against the history retriever
 */
export async function validateHistoryClaims(memoryDraftText, historyRetriever) {
  const result = {
    valid: true,
    checkedClaims: 0,
    citedClaims: 0,
    uncitedClaims: 0,
    errors: [],
    warnings: [],
    flagged: []
  };

  if (!memoryDraftText || !historyRetriever) {
    return result;
  }

  // Check if history is available before performing validation
  if (!(await historyRetriever.isAvailable())) {
    return result;
  }

  const lines = memoryDraftText.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments, empty lines, yaml markers, and root keys
    if (
      !line ||
      line.startsWith('#') ||
      line.startsWith('---') ||
      line.startsWith('...') ||
      line.endsWith(':')
    ) {
      continue;
    }

    // Extract value part of lists or key-value pairs
    let claimText = '';
    if (line.startsWith('- ')) {
      claimText = line.substring(2).trim();
    } else if (line.includes(':')) {
      const index = line.indexOf(':');
      claimText = line.substring(index + 1).trim();
    } else {
      claimText = line;
    }

    // Strip quotes and leading/trailing whitespace
    claimText = claimText.replace(/^['"]|['"]$/g, '').trim();

    // Filter out non-claims, structural text, short strings, and simple types
    if (
      claimText.length < 10 ||
      claimText === 'true' ||
      claimText === 'false' ||
      claimText === 'nothing' ||
      claimText === 'unknown' ||
      !isNaN(Number(claimText))
    ) {
      continue;
    }

    // Check if the claim explicitly declares itself as an inference
    if (
      claimText.toLowerCase().includes('[inference]') ||
      claimText.toLowerCase().includes('inference:')
    ) {
      result.uncitedClaims++;
      continue;
    }

    result.checkedClaims++;

    // Query history to see if the claim is grounded/cited in a prior session
    const isGrounded = await historyRetriever.searchHistory(claimText);

    if (isGrounded) {
      result.citedClaims++;
    } else {
      const issue = {
        claim: claimText,
        reason: 'no history citation found'
      };
      result.flagged.push(issue);
      
      // We push a warning instead of a hard error because history validation is advisory in v1
      result.warnings.push({
        type: 'uncited_claim',
        message: `Claim presented as fact but has no matching history: "${claimText}"`
      });
    }
  }

  // We set valid = false if there are uncited claims presented as facts
  if (result.flagged.length > 0) {
    result.valid = false;
  }

  return result;
}
