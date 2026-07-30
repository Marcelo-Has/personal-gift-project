import { error } from '@sveltejs/kit';
import { getEtapaBySlug } from '$lib/questionario-etapas';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const etapa = getEtapaBySlug(params.etapa);

	if (!etapa) {
		error(404, 'Etapa do questionário não encontrada.');
	}

	return { etapa };
};
