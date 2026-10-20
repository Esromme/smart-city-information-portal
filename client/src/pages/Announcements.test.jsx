import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const { mockList, mockStats, mockRemove } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockStats: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock('../api.js', () => ({
  api: {
    announcements: {
      list: mockList,
      create: vi.fn(),
      update: vi.fn(),
      remove: mockRemove,
    },
    stats: mockStats,
  },
}));

const { default: Announcements } = await import('./Announcements.jsx');

const LONG_NOTICE =
  'Water tank cleaning will run from 08:00 to 14:00 on Saturday, covering the central and northern neighbourhoods of Kombolcha. Residents are advised to store enough water for the day and to report any pressure problems to the city water office.';

const ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Water maintenance in central Kombolcha',
    content: LONG_NOTICE,
    category: 'utilities',
    published_at: '2026-10-19T07:00:00.000Z',
  },
  {
    id: 2,
    title: 'Road resurfacing on the Dessie road',
    content: 'Traffic is reduced to one lane while the surface is renewed.',
    category: 'transport',
    published_at: '2026-10-17T07:00:00.000Z',
  },
  {
    id: 3,
    title: 'City-wide cleaning day this Sunday',
    content: LONG_NOTICE,
    category: 'community',
    published_at: '2026-10-16T07:00:00.000Z',
  },
];

const STATS = {
  data: {
    totals: { services: 12, announcements: 12, locations: 12 },
    byCategory: {
      announcements: [
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

  mockList.mockResolvedValue({
    data: ANNOUNCEMENTS,
    count: ANNOUNCEMENTS.length,
  });
  mockStats.mockResolvedValue(STATS);
});

describe('Announcements feed', () => {
  it('shows the live announcement count from stats', async () => {
    render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');

    expect(screen.getByText(/announcements published/i)).toHaveTextContent(
      '12 announcements published'
    );
  });

  it('highlights the latest announcement once, above the feed', async () => {
    const { container } = render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');

    const featured = container.querySelector('.ann-featured');
    expect(featured).toHaveTextContent('Water maintenance in central Kombolcha');
    expect(screen.getByText('Latest announcement')).toBeInTheDocument();

    // The highlighted notice is not repeated as a feed card.
    expect(container.querySelector('.ann-feed')).not.toHaveTextContent(
      'Water maintenance in central Kombolcha'
    );
  });

  it('renders category, date and preview for each notice', async () => {
    render(<Announcements />);

    await screen.findByText('Road resurfacing on the Dessie road');

    expect(screen.getAllByText('Utilities').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Traffic is reduced to one lane while the surface is renewed.')
    ).toBeInTheDocument();
    expect(document.querySelectorAll('time').length).toBeGreaterThan(0);
  });

  it('requests only the selected category', async () => {
    render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');
    fireEvent.click(screen.getByRole('button', { name: /^Water/ }));

    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({ category: 'water', search: '' })
    );
  });

  it('searches after the input is debounced', async () => {
    render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');
    fireEvent.change(screen.getByLabelText(/search announcements/i), {
      target: { value: 'road' },
    });

    await waitFor(
      () =>
        expect(mockList).toHaveBeenLastCalledWith({
          category: 'all',
          search: 'road',
        }),
      { timeout: 2000 }
    );
  });

  it('re-orders the feed without moving the highlighted notice', async () => {
    const { container } = render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');
    fireEvent.change(screen.getByLabelText('Sort'), {
      target: { value: 'oldest' },
    });

    const feedTitles = Array.from(
      container.querySelectorAll('.ann-feed .ann-card-title')
    ).map((node) => node.textContent);

    expect(feedTitles).toEqual([
      'City-wide cleaning day this Sunday',
      'Road resurfacing on the Dessie road',
    ]);
    expect(
      container.querySelector('.ann-featured')
    ).toHaveTextContent('Water maintenance in central Kombolcha');
  });

  it('opens the full notice from "Read more"', async () => {
    render(<Announcements />);

    await screen.findByText('Water maintenance in central Kombolcha');
    fireEvent.click(
      screen.getAllByRole('button', { name: /read more/i })[0]
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Water maintenance in central Kombolcha',
    });
    expect(within(dialog).getByText(LONG_NOTICE)).toBeInTheDocument();
    expect(within(dialog).getByText(/utilities/i)).toBeInTheDocument();
  });

  it('offers a reset action when no notice matches', async () => {
    mockList.mockResolvedValue({ data: [], count: 0 });

    render(<Announcements />);

    await screen.findByText('No announcements yet');
    fireEvent.click(screen.getByRole('button', { name: /^Waste/ }));

    expect(await screen.findByText('No matching announcements')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() =>
      expect(screen.getByText('No announcements yet')).toBeInTheDocument()
    );
  });

  it('shows a retry action when the feed fails to load', async () => {
    mockList.mockRejectedValueOnce(new Error('Network down'));

    render(<Announcements />);

    expect(
      await screen.findByText('Announcements are unavailable right now')
    ).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(
      await screen.findByText('Water maintenance in central Kombolcha')
    ).toBeInTheDocument();
  });
});

describe('Announcements administrator permissions', () => {
  it('hides create and edit controls from public visitors', async () => {
    render(<Announcements isAdmin={false} />);

    await screen.findByText('Water maintenance in central Kombolcha');

    expect(screen.queryByRole('button', { name: /new announcement/i })).toBeNull();
    expect(
      screen.queryByLabelText(/edit water maintenance in central kombolcha/i)
    ).toBeNull();
    expect(
      screen.queryByLabelText(/delete water maintenance in central kombolcha/i)
    ).toBeNull();
  });

  it('shows create and edit controls to administrators', async () => {
    render(<Announcements isAdmin />);

    await screen.findByText('Water maintenance in central Kombolcha');

    expect(
      screen.getByRole('button', { name: /new announcement/i })
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/edit water maintenance in central kombolcha/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/delete water maintenance in central kombolcha/i)
    ).toBeInTheDocument();
  });

  it('does not offer an empty-state action to public visitors', async () => {
    mockList.mockResolvedValue({ data: [] });

    render(<Announcements isAdmin={false} />);

    await screen.findByText('No announcements yet');
    expect(screen.queryByRole('button', { name: /new announcement/i })).toBeNull();
  });

  it('deletes a notice through the existing API when confirmed', async () => {
    mockRemove.mockResolvedValue({});
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Announcements isAdmin />);

    await screen.findByText('City-wide cleaning day this Sunday');
    fireEvent.click(
      screen.getByLabelText(/delete city-wide cleaning day this sunday/i)
    );

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(3));
    expect(await screen.findByText('Announcement deleted.')).toBeInTheDocument();

    confirm.mockRestore();
  });
});
