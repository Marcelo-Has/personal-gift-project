/**
 * Conformidade PDF/X-4 (`OutputIntent`/ICC + metadados XMP mínimos) sobre um `PDFDocument`
 * já montado — etapa de finalização usada por `renderBookToPdf` (F2-08c2, issue #139),
 * depois que os spreads já foram copiados para o documento final (F2-08c1, [D-065]).
 *
 * `pdf-lib` (`^1.17.1`, já `dependency` desde [D-066]) não expõe `OutputIntent`/XMP como
 * API de alto nível, mas o `PDFContext` de baixo nível (`context.obj`/`context.register`/
 * `context.flateStream`, já público) é suficiente para montar as duas estruturas exigidas
 * pela spec (ISO 15930-7 via PDF 1.6) sem precisar de dependência nova, conforme
 * `.claude/rules/right-sizing.md`. Perfil ICC embutido em `icc-srgb.ts` (D-067).
 */
import { randomUUID } from 'node:crypto';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { SRGB_ICC_PROFILE } from './icc-srgb';

/** Título fixo do PDF de produção (Info dict + XMP `dc:title`). O `GeneratedBook` (F2-06c,
 * `layout.ts`) não carrega um título de pedido — usar um valor fixo evita inventar um
 * campo novo fora do escopo desta issue (ver "Fora de escopo" na issue #139). */
const PDFX4_TITLE = 'Nossa História — livro personalizado';
const PRODUCER = 'Personal Gift Project — generation-engine (pdf-lib)';

/** BOM (U+FEFF) exigido no início do pacote XMP (`<?xpacket begin="<BOM>"`) para as
 * ferramentas detectarem o encoding — montado via `fromCharCode` em vez de caractere
 * literal no código-fonte para não disparar `no-irregular-whitespace` do ESLint. */
const XMP_BOM = String.fromCharCode(0xfeff);

/** Monta o pacote XMP com os campos mínimos de conformidade PDF/X-4: `pdfxid:GTS_PDFXVersion`
 * (o marcador que identifica o arquivo como PDF/X-4), `dc:title`/`dc:format` (Dublin Core) e
 * `xmpMM:DocumentID`/`InstanceID` (identidade do documento, exigida pela spec de metadados
 * do PDF/X-4). Namespace `pdfxid` é o mesmo usado por ferramentas de referência (Adobe
 * Acrobat/Distiller) para esse marcador. */
function buildXmpPacket(documentId: string, instanceId: string): string {
	return `<?xpacket begin="${XMP_BOM}" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about=""
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:xmp="http://ns.adobe.com/xap/1.0/"
  xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"
  xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/"
  xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
<dc:format>application/pdf</dc:format>
<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${PDFX4_TITLE}</rdf:li></rdf:Alt></dc:title>
<pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>
<pdf:Trapped>False</pdf:Trapped>
<xmp:CreatorTool>${PRODUCER}</xmp:CreatorTool>
<xmpMM:DocumentID>uuid:${documentId}</xmpMM:DocumentID>
<xmpMM:InstanceID>uuid:${instanceId}</xmpMM:InstanceID>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Aplica conformidade PDF/X-4 a um `PDFDocument` já montado: adiciona `/OutputIntents`
 * (subtipo `GTS_PDFX`, perfil ICC sRGB embutido — `icc-srgb.ts`) ao catálogo, e um stream
 * `/Metadata` (XMP) com os campos mínimos exigidos pela spec. Muta `doc` in-place — chamar
 * antes de `doc.save()`.
 */
export function applyPdfX4Conformance(doc: PDFDocument): void {
	const context = doc.context;

	const iccStream = context.flateStream(SRGB_ICC_PROFILE, {
		N: 3,
		Alternate: PDFName.of('DeviceRGB')
	});
	const iccRef = context.register(iccStream);

	const outputIntent = context.obj({
		Type: 'OutputIntent',
		S: 'GTS_PDFX',
		OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
		OutputCondition: PDFString.of('sRGB IEC61966-2.1 (perfil simplificado, D-067)'),
		RegistryName: PDFString.of('http://www.color.org'),
		Info: PDFString.of('sRGB IEC61966-2.1'),
		DestOutputProfile: iccRef
	});
	const outputIntentRef = context.register(outputIntent);
	doc.catalog.set(PDFName.of('OutputIntents'), context.obj([outputIntentRef]));

	const xmpBytes = new TextEncoder().encode(buildXmpPacket(randomUUID(), randomUUID()));
	const metadataStream = context.stream(xmpBytes, {
		Type: 'Metadata',
		Subtype: 'XML'
	});
	doc.catalog.set(PDFName.of('Metadata'), context.register(metadataStream));

	doc.setTitle(PDFX4_TITLE);
	doc.setProducer(PRODUCER);
}
