import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const { mockServices, mockLocations, mockStats } = vi.hoisted(() => ({
  mockServices: vi.fn(),
  mockLocations: vi.fn(),
  mockStats: vi.fn(),
}));

vi.mock('../api.js', () => ({
  api: {
    services: { list: mockServices },
    locations: { list: mockLocations },
    stats: mockStats,
  },
}));

// Leaflet needs a real layout engine; the transport page only passes filtered
// points through to the existing map component, so stub it with a probe.
vi.mock('../components/CityMap.jsx', () => ({
  default: ({ locations = [], selectedId }) => (
    <div
      data-testid="city-map"
      data-count={locations.length}
      data-selected={selectedId ?? ''}
    />
  ),
}));

const { default: Transport } = await import('./Transport.jsx');

const SERVICES = [
  {
    id: 10,
    name: 'Kombolcha Bus Station',
    category: 'transport',
    description:
      'Intercity and regional bus terminal serving Dessie, Addis Ababa and nearby towns.',
    location: 'Dessie Road, Kombolcha',
  },
  {
    id: 11,
    name: 'Transport office',
    category: 'transportation',
    description: 'Permits and route information.',
    location: null,
  },
];

const POINTS = [
  {
    id: 10,
    name: 'Kombolcha Bus Station',
    category: 'transport',
    latitude: 11.0925,
    longitude: 39.7442,
  },
];

const STATS = {
  data: {
    totals: { services: 12, announcements: 6, locations: 12 },
    byCategory: {
      services: [
        { category: 'other', count: 9 },
        { category: 'transportation', count: 3 },
      ],
      locations: [{ category: 'transportation', count: 1 }],
    },
  },
};

beforeEach(() => {
  mockServices.mockReset();
  mockLocations.mockReset();
  mockStats.mockReset();

  mockServices.mockResolvedValue({ data: SERVICES, count: SERVICES.length });
  mockLocations.mockResolvedValue({ data: POINTS, count: POINTS.length });
  mockStats.mockResolvedValue(STATS);
});

describe('Transportation directory', () => {
  it('shows the transport listing count from live stats', async () => {
    render(<Transport />);

    await screen.findByRole('heading', { name: 'Kombolcha Bus Station' });

    expect(screen.getByText(/transport listings/i)).toHaveTextContent(
      '3 transport listings'
    );
  });

  it('renders the service name, description and location from the record', async () => {
    render(<Transport />);

    expect(
      await screen.findByRole('heading', { name: 'Kombolcha Bus Station' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Intercity and regional bus terminal/)
    ).toBeInTheDocument();
    expect(screen.getByText('Dessie Road, Kombolcha')).toBeInTheDocument();
    // A record without a location simply omits that row.
    expect(screen.getByText('Transport office')).toBeInTheDocument();
  });

  it('searches the directory after the input is debounced', async () => {
    render(<Transport />);

    await screen.findByRole('heading', { name: 'Kombolcha Bus Station' });
    expect(mockServices).toHaveBeenLastCalledWith({
      category: 'transportation',
      search: '',
    });

    mockServices.mockResolvedValue({ data: [SERVICES[0]], count: 1 });

    fireEvent.change(
      screen.getByLabelText(/search transport services by name/i),
      { target: { value: 'bus' } }
    );

    await waitFor(
      () =>
        expect(mockServices).toHaveBeenLastCalledWith({
          category: 'transportation',
          search: 'bus',
        }),
      { timeout: 2000 }
    );

    expect(
      await screen.findByText('Showing 1 of 3 service listings')
    ).toBeInTheDocument();
  });

  it('offers a reset action when no service matches', async () => {
    mockServices.mockResolvedValue({ data: [], count: 0 });

    render(<Transport />);

    await screen.findByText('No transport services listed');

    fireEvent.change(
      screen.getByLabelText(/search transport services by name/i),
      { target: { value: 'zzz' } }
    );

    expect(
      await screen.findByText('No matching transport services', undefined, {
        timeout: 2000,
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset search/i }));

    await waitFor(() =>
      expect(screen.getByText('No transport services listed')).toBeInTheDocument()
    );
  });

  it('shows a retry action when the directory fails to load', async () => {
    mockServices.mockRejectedValueOnce(new Error('Network down'));

    render(<Transport />);

    expect(
      await screen.findByText('Transport services are unavailable right now')
    ).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(
      await screen.findByRole('heading', { name: 'Kombolcha Bus Station' })
    ).toBeInTheDocument();
  });

  it('lists mapped points and selects one on the map', async () => {
    render(<Transport />);

    const panel = await screen.findByRole('complementary', {
      name: /mapped transport points/i,
    });

    expect(within(panel).getByText('11.0925, 39.7442')).toBeInTheDocument();
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-count', '1');

    fireEvent.click(
      within(panel).getByRole('button', { name: /Kombolcha Bus Station/ })
    );

    expect(screen.getByTestId('city-map')).toHaveAttribute('data-selected', '10');
  });

  it('locates a listing on the map when a mapped point shares its name', async () => {
    render(<Transport />);

    await screen.findByRole('heading', { name: 'Kombolcha Bus Station' });

    fireEvent.click(
      screen.getByRole('button', {
        name: /^Show Kombolcha Bus Station on the map$/i,
      })
    );

    expect(screen.getByTestId('city-map')).toHaveAttribute('data-selected', '10');
    // No mapped point matches the second listing, so it offers no map action.
    expect(
      screen.queryByRole('button', {
        name: /^Show Transport office on the map$/i,
      })
    ).toBeNull();
  });

  it('states that directory listings are not live tracking data', async () => {
    render(<Transport />);

    await screen.findByRole('heading', { name: 'Kombolcha Bus Station' });

    expect(screen.getByText('Directory information')).toBeInTheDocument();
    expect(screen.getByText(/live\s+vehicle tracking/i)).toBeInTheDocument();
    expect(screen.queryByText(/vehicles online|fares|departures/i)).toBeNull();
  });
});
