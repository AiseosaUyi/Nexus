import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewPageModal from './NewPageModal';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

const createNode = vi.fn();
vi.mock('@/app/(dashboard)/w/[workspace_slug]/actions', () => ({
  createNode: (...args: unknown[]) => createNode(...args),
  createTeamspace: vi.fn(),
}));

describe('NewPageModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the new page after creating it (regression: page was created but not opened)', async () => {
    createNode.mockResolvedValue({ data: { id: 'node-42', business_id: 'biz-1', type: 'document', title: 'Untitled' } });
    const order: string[] = [];
    push.mockImplementation(() => order.push('push'));
    const onClose = vi.fn(() => order.push('close'));
    const created = vi.fn();
    window.addEventListener('nexus:node-created', created);

    render(
      <NewPageModal isOpen onClose={onClose} businessId="biz-1" workspaceSlug="studyassist" teamspaces={[]} />,
    );

    fireEvent.click(screen.getByText('Private'));
    fireEvent.click(screen.getByText('Create page'));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/w/studyassist/n/node-42'));
    expect(createNode).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: 'biz-1', type: 'document', teamspace_id: null }),
    );
    expect(created).toHaveBeenCalledTimes(1);
    // Navigate before the modal unmounts itself.
    expect(order).toEqual(['push', 'close']);

    window.removeEventListener('nexus:node-created', created);
  });

  it('stays open and does not navigate when creation fails', async () => {
    createNode.mockResolvedValue({ error: 'You don’t have permission to do that.' });
    const onClose = vi.fn();

    render(
      <NewPageModal isOpen onClose={onClose} businessId="biz-1" workspaceSlug="studyassist" teamspaces={[]} />,
    );

    fireEvent.click(screen.getByText('Private'));
    fireEvent.click(screen.getByText('Create page'));

    await waitFor(() => expect(createNode).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
