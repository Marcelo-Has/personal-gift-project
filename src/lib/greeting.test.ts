import { describe, expect, it } from 'vitest';
import { getPlaceholderTitle } from './greeting';

describe('getPlaceholderTitle', () => {
	it('deve retornar o título placeholder quando chamada', () => {
		expect(getPlaceholderTitle()).toBe('Personal Gift Project');
	});
});
