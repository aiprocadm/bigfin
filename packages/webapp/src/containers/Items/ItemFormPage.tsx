import React from 'react';
import { useParams } from 'react-router-dom';
import ItemForm from './ItemForm';

/**
 * Item form page.
 */
export default function ItemFormPage() {
  const { id } = useParams<{ id?: string }>();
  const idInteger = parseInt(id ?? '', 10);

  return <ItemForm itemId={idInteger} />;
}
