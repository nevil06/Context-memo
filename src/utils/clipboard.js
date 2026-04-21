import clipboardy from 'clipboardy';

export async function copyToClipboard(text) {
  try {
    await clipboardy.write(text);
    return true;
  } catch (error) {
    return false;
  }
}
