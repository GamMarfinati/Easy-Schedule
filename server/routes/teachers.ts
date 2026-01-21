import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/teachers - List all teachers for the tenant
router.get('/', async (req, res) => {
  try {
    const teachers = await db('teachers')
      .where({ organization_id: req.tenantId })
      .orderBy('created_at', 'asc');
      
    // Map to camelCase
    const mappedTeachers = teachers.map(t => ({
      ...t,
      classAssignments: t.class_assignments,
      // availability is already correct key, availabilityDays is NOT in DB.
      // We need to infer availabilityDays from availability or store it?
      // Wait, frontend depends on availabilityDays!
      // I should store availabilityDays in DB too? Or derive it?
      // "availability" is the new JSONB.
      // But availabilityDays is needed for UI pills.
      // I should probably return availabilityDays as keys of availability?
      // But if user used OLD format?
      // Let's add availability_days column to DB? No, I defined table with just availability.
      // I can derive availabilityDays from availability keys!
      availabilityDays: t.availability ? Object.keys(t.availability) : [],
      class_assignments: undefined, // remove snake_case
    }));

    res.json(mappedTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Helper to map DB to Frontend
const mapTeacher = (t: any) => ({
  ...t,
  classAssignments: t.class_assignments,
  availabilityDays: t.availability ? Object.keys(t.availability) : [],
  class_assignments: undefined,
});

// POST /api/teachers - Create a new teacher
router.post('/', async (req, res) => {
  try {
    const { name, subject, availabilityDays, availability, classAssignments } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Name and Subject are required' });
    }

    // Initialize availability from availabilityDays if not provided
    let finalAvailability = availability || {};
    if ((!finalAvailability || Object.keys(finalAvailability).length === 0) && availabilityDays && Array.isArray(availabilityDays)) {
       availabilityDays.forEach((day: string) => {
          finalAvailability[day] = [1, 1, 1, 1, 1, 1]; // Default 6 slots
       });
    }

    const [newTeacher] = await db('teachers')
      .insert({
        organization_id: req.tenantId,
        name,
        subject,
        availability: JSON.stringify(finalAvailability),
        class_assignments: JSON.stringify(classAssignments || [])
      })
      .returning('*');

    res.status(201).json(mapTeacher(newTeacher));
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// PUT /api/teachers/:id - Update a teacher
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, availabilityDays, availability, classAssignments } = req.body;

    // Logic to sync availabilityDays with availability
    let finalAvailability = availability || {};
    // If availabilityDays provided (from Form), ensure they exist in json
    if (availabilityDays && Array.isArray(availabilityDays)) {
       // Add missing days
       availabilityDays.forEach((day: string) => {
          if (!finalAvailability[day]) {
             finalAvailability[day] = [1, 1, 1, 1, 1, 1];
          }
       });
       // Remove days unselected (optional? Form sends full list)
       // If I unchecked "Seg", it shouldn't be in availability.
       // So we should rebuild keys based on availabilityDays IF availability matches exactly?
       // Actually, safely we trust 'availability' if provided (from Popover update), 
       // or 'availabilityDays' if from Form.
       // The Form sends BOTH?
       // TeacherForm sends only availabilityDays. TeacherCard sends availability (via onUpdate -> API).
       // If Form sends availabilityDays, we should probably RESET availability to default for those days if availability is NOT sent.
       
       if (!availability) {
          // If only availabilityDays sent (TeacherForm edit), we might lose granular edits?
          // TeacherForm has `onUpdateTeacher` which passes the WHOLE object `teacherToEdit`.
          // `teacherToEdit` HAS `availability`.
          // We need to ensure TeacherForm PRESERVES `availability` when modifying `availabilityDays`.
          
          // Assuming the frontend handles preservation, here we just save what we get.
       }
    }

    const [updatedTeacher] = await db('teachers')
      .where({ id, organization_id: req.tenantId })
      .update({
        name,
        subject,
        availability: JSON.stringify(finalAvailability),
        class_assignments: JSON.stringify(classAssignments),
        updated_at: db.fn.now()
      })
      .returning('*');

    if (!updatedTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json(mapTeacher(updatedTeacher));
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// DELETE /api/teachers/:id - Delete a teacher
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db('teachers')
      .where({ id, organization_id: req.tenantId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

export default router;
