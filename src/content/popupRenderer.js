export function renderSuccessContent(viewModel) {
  return [
    { type: 'headword', value: viewModel?.headword ?? '' },
    { type: 'pronunciation', value: viewModel?.pronunciation ?? '' },
    {
      type: 'definition',
      value: viewModel?.definition ?? viewModel?.mainDefinition ?? '',
    },
  ];
}
