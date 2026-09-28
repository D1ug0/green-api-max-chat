import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { conversationStore } from '@/entities/conversation';
import { ChatSidebar } from './chat-sidebar';

beforeEach(() => {
  conversationStore.getState().reset();
  conversationStore.getState().addChats([
    { id: 'chat-1', title: 'Александр' },
    { id: 'chat-2', title: 'Николай' },
  ]);
});
afterEach(() => {
  cleanup();
  conversationStore.getState().reset();
});

describe('draft in the chat list', () => {
  it('shows an unsent draft after switching chats and restores the message preview when cleared', () => {
    render(<ChatSidebar onNewChat={() => {}} />);
    const alexander = screen.getByRole('button', { name: /Александр/ });
    const nikolay = screen.getByRole('button', { name: /Николай/ });
    conversationStore.getState().activate('chat-1');
    conversationStore.getState().setDraft('chat-1', 'Напишу позже');
    fireEvent.click(nikolay);

    expect(within(alexander).getByText('Черновик:')).toBeInTheDocument();
    expect(within(alexander).getByText('Напишу позже')).toBeInTheDocument();
    expect(within(nikolay).queryByText('Черновик:')).not.toBeInTheDocument();

    act(() => conversationStore.getState().setDraft('chat-1', ''));
    expect(within(alexander).queryByText('Черновик:')).not.toBeInTheDocument();
    expect(within(alexander).getByText('Открыть переписку')).toBeInTheDocument();
  });
});
