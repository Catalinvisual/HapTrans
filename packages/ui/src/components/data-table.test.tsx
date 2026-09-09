import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './data-table';

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: DataTableColumn<Row>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'status', header: 'Status', cell: (row) => <strong>{row.status}</strong> },
];

const rows: Row[] = [
  { id: '1', name: 'Alpha', status: 'Active' },
  { id: '2', name: 'Beta', status: 'Idle' },
];

describe('DataTable', () => {
  it('renders table headers and rows', () => {
    render(<DataTable columns={columns} data={rows} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders cell renderers for columns without an accessorKey', () => {
    render(<DataTable columns={columns} data={rows} />);
    const cell = screen.getByText('Active');
    expect(cell.tagName).toBe('STRONG');
  });

  it('shows empty state when there is no data', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows loading skeletons while loading', () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} isLoading />,
    );
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows an error message and retry button when error is set', () => {
    render(
      <DataTable columns={columns} data={[]} error={new Error('boom')} />,
    );
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('triggers onRowClick for a row', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} data={rows} onRowClick={onRowClick} />,
    );
    screen.getByText('Alpha').click();
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('renders pagination controls when pagination is provided', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={{
          pageIndex: 0,
          pageSize: 10,
          onPaginationChange: () => {},
        }}
      />,
    );
    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeEnabled();
  });
});
