import { render, screen } from '@testing-library/react';
import { PackingDiagram } from '@/components/personlig/packing-diagram';

it('shows the three placement groups from the supplied packing aid', () => {
  render(<PackingDiagram />);

  expect(screen.getByText('På kropp')).toBeInTheDocument();
  expect(screen.getByText('I ryggsekk')).toBeInTheDocument();
  expect(screen.getByText('I bag')).toBeInTheDocument();
  expect(screen.getByText(/hjelm under topplokk/i)).toBeInTheDocument();
});
