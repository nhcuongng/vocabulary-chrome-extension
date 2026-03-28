export function mapParsedPayloadToPopupViewModel(parsedPayload) {
  const headword = parsedPayload?.headword ?? '';
  const pronunciation = parsedPayload?.pronunciation ?? '';
  const mainDefinition = parsedPayload?.definitions?.[0] ?? '';

  return {
    state: 'success',
    orderedFields: ['headword', 'pronunciation', 'definition'],
    headword,
    pronunciation,
    definition: mainDefinition,
    mainDefinition,
  };
}
