import { render, screen } from '@testing-library/react';
import { StatCard } from '../components/common/StatCard';

describe('StatCard Component', () => {
  it('renders title and numerical value correctly', () => {
    render(<StatCard title="Adherence Rate" value="94.2%" trend="+3.5%" />);

    expect(screen.getByText('Adherence Rate')).toBeInTheDocument();
    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('+3.5%')).toBeInTheDocument();
  });
});
