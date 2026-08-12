import { useState, useId, useCallback, useMemo } from 'react';
import { Button, Heading, Modal, Radio, RadioGroup } from '@/components/ui';
import { INSERT_TABS, type InsertOption } from '@/lib/insertTabs';
import styles from './AddInsertModal.module.css';

interface AddInsertModalProps {
  open: boolean;
  existingInserts: string[];
  onClose: () => void;
  onAdd: (insert: InsertOption) => void;
}

export const AddInsertModal = ({ open, existingInserts, onClose, onAdd }: AddInsertModalProps) => {
  const headingId = useId();
  const availableOptions = useMemo(
    () => INSERT_TABS.filter(({ id }) => !existingInserts.includes(id)),
    [existingInserts]
  );
  // The parent mounts this modal only while open, so the default selection is set
  // once on mount from the currently available options — no reset effect needed.
  const [selected, setSelected] = useState<InsertOption>(() => availableOptions[0]?.id ?? INSERT_TABS[0].id);

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(e.currentTarget.value as InsertOption);
  }, []);

  const handleAdd = useCallback(() => {
    onAdd(selected);
  }, [onAdd, selected]);

  return (
    <Modal open={open} onClose={onClose} aria-labelledby={headingId}>
      <Heading as="h2" size="md" id={headingId}>Add an Insert</Heading>
      <RadioGroup legend="Insert type" legendHidden className={styles.options}>
        {availableOptions.map(({ id, label }) => (
          <Radio
            key={id}
            name="insert-option"
            value={id}
            label={label}
            checked={selected === id}
            onChange={handleSelectChange}
          />
        ))}
      </RadioGroup>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleAdd}>Add</Button>
      </div>
    </Modal>
  );
};
