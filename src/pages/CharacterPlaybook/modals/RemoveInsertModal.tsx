import { useId, useState, useCallback } from 'react';
import { Button, Heading, Modal, Text } from '@/components/ui';
import { useToast } from '@/components/app';
import { getInsertTab, type InsertOption } from '@/lib/insertTabs';
import styles from './RemoveInsertModal.module.css';

interface RemoveInsertModalProps {
  open: boolean;
  insert: InsertOption | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const RemoveInsertModal = ({ open, insert, onClose, onConfirm }: RemoveInsertModalProps) => {
  const headingId = useId();
  const { addToast } = useToast();
  // The parent mounts this modal only while open, so `removing` resets naturally
  // on each open — no reset effect needed.
  const [removing, setRemoving] = useState(false);
  // Show the insert's display label, not the id persisted in CharacterData.inserts — they happen
  // to match today, but only the label is meant to be read by a player.
  const definition = insert ? getInsertTab(insert) : undefined;
  const label = definition?.label ?? insert ?? '';
  const warning = definition?.removeWarning;

  const handleConfirm = useCallback(async () => {
    setRemoving(true);
    try {
      await onConfirm();
      setRemoving(false);
      onClose();
    } catch {
      setRemoving(false);
      addToast('Failed to remove insert. Try again.', 'error');
    }
  }, [onConfirm, onClose, addToast]);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby={headingId}>
      <Heading as="h2" size="md" id={headingId}>Remove {label}?</Heading>
      {insert && (
        <Text font="serif" color="muted" className={styles.warning}>{`This will remove the **${label}** tab from this character sheet.${warning ? ` ${warning}` : ''}`}</Text>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={removing}>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm} disabled={removing}>
          {removing ? 'Removing…' : 'Remove'}
        </Button>
      </div>
    </Modal>
  );
};
