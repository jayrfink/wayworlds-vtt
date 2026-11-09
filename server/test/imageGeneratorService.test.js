import { describe, it, expect } from 'vitest';
import { buildTokenPrompt } from '../src/imageGeneratorService.js';

describe('imageGeneratorService', () => {
  it('builds prompt from explicit user visual description', () => {
    const prompt = buildTokenPrompt({
      prompt: 'A scarred Frost Urkai raider with a notched greataxe and wolf-pelt cloak',
      name: 'Frost Urkai Berserker',
      species: 'Frost Urkai',
      category: 'npc',
      weapon: 'Greataxe',
    });

    expect(prompt).toContain('A scarred Frost Urkai raider with a notched greataxe');
    expect(prompt).toContain('Cinematic dark fantasy character portrait');
    expect(prompt).toContain('centered composition for circular tabletop battle token');
  });

  it('builds prompt for NPC when no description is provided', () => {
    const prompt = buildTokenPrompt({
      name: 'Dusk Elf Ranger',
      species: 'Dusk Elves',
      category: 'npc',
      weapon: 'Longbow',
      armor: 'Leather Armor',
    });

    expect(prompt).toContain('Wayworlds Dusk Elves warrior');
    expect(prompt).toContain('Longbow');
    expect(prompt).toContain('Leather Armor');
  });

  it('builds prompt for Creature when no description is provided', () => {
    const prompt = buildTokenPrompt({
      name: 'Sand Burrower',
      category: 'creature',
      attacks: 'Venomous Stinger, Mandibles',
    });
    expect(prompt).toContain('predatory beast called Sand Burrower');
    expect(prompt).toContain('Venomous Stinger, Mandibles');
  });

  it('throws RATE_LIMITED error with retryAfter when provider returns 402/429', async () => {
    const { generateAiImage } = await import('../src/imageGeneratorService.js');
    const origFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 402,
      headers: {
        get: (h) => (h.toLowerCase() === 'retry-after' ? '30' : null),
      },
      json: async () => ({
        error: { message: 'Free limit reached: 1 image every 45 seconds per IP. Retry after 30s' },
      }),
    });

    try {
      await expect(generateAiImage('test prompt')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
        retryAfter: 30,
      });
    } finally {
      global.fetch = origFetch;
    }
  });

  it('saves generated AI token art into the specified target folder without leaving raw duplicate files', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const sharp = (await import('sharp')).default;
    const { generateTokenArtFromDescription } = await import('../src/imageGeneratorService.js');

    const tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-token-folder-test-'));
    const origFetch = global.fetch;

    const fakeImageBuffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 100, g: 150, b: 200 } },
    })
      .jpeg()
      .toBuffer();

    global.fetch = async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        fakeImageBuffer.buffer.slice(
          fakeImageBuffer.byteOffset,
          fakeImageBuffer.byteOffset + fakeImageBuffer.byteLength
        ),
    });

    try {
      const result = await generateTokenArtFromDescription({
        prompt: 'Frost Urkai shaman',
        name: 'Urkai Shaman',
        species: 'Frost Urkai',
        category: 'npc',
        threat_tier: 3,
        folder: 'tokens/frost-urkai',
        uploadDir: tempUploadDir,
      });

      expect(result.folder).toBe('tokens/frost-urkai');
      expect(result.token_image_url).toMatch(/^\/uploads\/tokens\/frost-urkai\/token_urkai-shaman-\d+\.png$/);
      expect(result.source_image_url).toBe(result.token_image_url);

      const relTokenPath = result.token_image_url.replace(/^\/uploads\//, '');
      const fullTokenPath = path.join(tempUploadDir, relTokenPath);
      expect(fs.existsSync(fullTokenPath)).toBe(true);

      // Ensure no intermediate raw_*.jpg file was left behind in the folder
      const folderFiles = fs.readdirSync(path.dirname(fullTokenPath));
      expect(folderFiles.some((f) => f.startsWith('raw_'))).toBe(false);
    } finally {
      global.fetch = origFetch;
      fs.rmSync(tempUploadDir, { recursive: true, force: true });
    }
  });
});
