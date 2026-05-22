const express = require('express');

const router = express.Router();

let rows = [
  { id: 1, feederName: 'FD-12 North Loop', substation: 'Oak Ridge', queuedMw: 18.4, availableMw: 6.2, interconnectRequests: 7, constraint: 'Transformer thermal limit', status: 'constrained' },
  { id: 2, feederName: 'FD-07 Industrial', substation: 'Riverbend', queuedMw: 9.1, availableMw: 14.8, interconnectRequests: 3, constraint: 'No active constraint', status: 'available' },
];
const nextId = () => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

router.get('/', (req, res) => res.json(rows));
router.post('/', (req, res) => {
  const row = { id: nextId(), ...req.body };
  rows.unshift(row);
  res.status(201).json(row);
});
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = rows.findIndex((row) => row.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  rows[idx] = { ...rows[idx], ...req.body, id };
  res.json(rows[idx]);
});
router.delete('/:id', (req, res) => {
  rows = rows.filter((row) => row.id !== Number(req.params.id));
  res.json({ message: 'deleted' });
});

module.exports = router;
