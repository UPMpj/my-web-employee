import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../components/ConfirmModal';

describe('ConfirmModal', () => {
  it('renders the message, sub-message, and default Lao button labels', () => {
    render(<ConfirmModal message="ລຶບແທ້ບໍ?" subMessage="ບໍ່ສາມາດກັບຄືນໄດ້" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('ລຶບແທ້ບໍ?')).toBeTruthy();
    expect(screen.getByText('ບໍ່ສາມາດກັບຄືນໄດ້')).toBeTruthy();
    expect(screen.getByText('ຢືນຢັນ')).toBeTruthy();
    expect(screen.getByText('ຍົກເລີກ')).toBeTruthy();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal message="msg" confirmLabel="Yes" cancelLabel="No" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Yes'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal message="msg" confirmLabel="Yes" cancelLabel="No" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('No'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when clicking the overlay, but not when clicking inside the box', () => {
    const onCancel = vi.fn();
    const { container } = render(<ConfirmModal message="msg" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('msg')); // inside the box
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('.cfm-overlay')); // the backdrop itself
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
