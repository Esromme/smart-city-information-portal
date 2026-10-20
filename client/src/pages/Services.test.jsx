import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const { mockList, mockStats, mockRemove } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockStats: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock('../api.js', () => ({
  api: {
    services: {
      list: mockList,
      create: vi.fn(),
      update: vi.fn(),
      remove: mockRemove,
    },
    stats: mockStats,
  },
}));

const { default: Services } = await import('./Services.jsx');

const SERVICES = [
  {
    id: 1,
    name: 'Bole waste collection',
    category: 'waste',
    description: 'Weekly household collection.',
    location: 'Bole sub-city',
  },
  {
    id: 2,
    name: 'Water office',
    category: 'utilities',
    description: 'Report a leaking pipe.',
    location: 'City centre',
  },
  {
    id: 3,
    name: 'Fire brigade',
    category: 'emergency',
    description: null,
    location: null,
  },
];

const STATS = {
  data: {
    totals: { services: 12, announcements: 4, locations: 12 },
    byCategory: {
      services: [
        { category: 'emergency', count: 2 },
        { category: 'other', count: 9 },
        { category: 'transportation', count: 1 },
      ],
    },
  },
};

beforeEach(() => {
  mockList.mockReset();
  mockStats.mockReset();
  mockRemove.mockReset();

  mockList.mockResolvedValue({ data: SERVICES, count: SERVICES.length });
  mockStats.mockResolvedValue(STATS);
});

describe('Services directory', () => {
  it('shows the directory count from live stats', async () => {
    render(<Services />);

    await screen.findByText('Fire brigade');

    expect(screen.getByText(/services available/i)).toHaveTextContent(
      '12 services available'
    );
  });

  it('renders service name, description and location when available', async () => {
    render(<Services />);

    expect(await screen.findByText('Bole waste collection')).toBeInTheDocument();
    expect(screen.getByText('Weekly household collection.')).toBeInTheDocument();
    expect(screen.getByText('Bole sub-city')).toBeInTheDocument();
  });

  it('requests only the selected category', async () => {
    render(<Services />);

    await screen.findByText('Fire brigade');
    fireEvent.click(screen.getByRole('button', { name: /^Water/ }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({ category: 'water', search: '' })
    );
  });

  it('searches services after the input is debounced', async () => {
    render(<Services />);

    await screen.findByText('Fire brigade');
    fireEvent.change(screen.getByLabelText(/search services/i), {
      target: { value: 'pipe' },
    });

    await waitFor(
      () =>
        expect(mockList).toHaveBeenLastCalledWith({
          category: 'all',
          search: 'pipe',
        }),
      { timeout: 2000 }
    );
  });

  it('offers a reset action when no service matches', async () => {
    mockList.mockResolvedValue({ data: [], count: 0 });

    render(<Services />);

    await screen.findByText('No services listed');
    fireEvent.click(screen.getByRole('button', { name: /^Waste/ }));

    expect(await screen.findByText('No matching services')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() =>
      expect(screen.getByText('No services listed')).toBeInTheDocument()
    );
  });

  it('shows a retry action when the directory fails to load', async () => {
    mockList.mockRejectedValueOnce(new Error('Network down'));

    render(<Services />);

    expect(
      await screen.findByText('Services are unavailable right now')
    ).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Fire brigade')).toBeInTheDocument();
  });
});

describe('Services administrator permissions', () => {
  it('hides create, edit and delete controls from public visitors', async () => {
    render(<Services isAdmin={false} />);

    await screen.findByText('Fire brigade');

    expect(screen.queryByRole('button', { name: /add service/i })).toBeNull();
    expect(screen.queryByLabelText(/edit fire brigade/i)).toBeNull();
    expect(screen.queryByLabelText(/delete fire brigade/i)).toBeNull();
  });

  it('shows create, edit and delete controls to administrators', async () => {
    render(<Services isAdmin />);

    await screen.findByText('Fire brigade');

    expect(
      screen.getByRole('button', { name: /add service/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/edit fire brigade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delete fire brigade/i)).toBeInTheDocument();
  });

  it('deletes a service through the existing API when confirmed', async () => {
    mockRemove.mockResolvedValue({});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Services isAdmin />);

    await screen.findByText('Fire brigade');
    fireEvent.click(screen.getByLabelText(/delete fire brigade/i));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(3));
    expect(await screen.findByText('Service deleted.')).toBeInTheDocument();

    confirm.mockRestore();
  });
});
