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
});
