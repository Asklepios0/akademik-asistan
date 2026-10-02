import { Course, COMMON_CLASSROOMS } from '../types';

/**
 * Normalizes Turkish strings for smart case-insensitive matching
 */
export function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .toLocaleLowerCase('tr-TR')
    .trim();
}

export interface PredictionResult {
  suggestedInstructors: { name: string; count: number }[];
  suggestedClassrooms: { name: string; count: number }[];
  suggestedCourseNames: { name: string; count: number }[];
  autoFillHint?: {
    courseName?: string;
    instructor?: string;
    classroom?: string;
    description: string;
  };
}

export class SuggestionEngine {
  private courses: Course[] = [];

  constructor(courses: Course[] = []) {
    this.courses = courses;
  }

  public setCourses(courses: Course[]) {
    this.courses = courses;
  }

  /**
   * Returns suggestions based on what the user is currently typing in any field.
   */
  public getPredictions(current: {
    name?: string;
    instructor?: string;
    classroom?: string;
  }): PredictionResult {
    const qName = normalizeTurkish(current.name || '');
    const qInstructor = normalizeTurkish(current.instructor || '');
    const qClassroom = normalizeTurkish(current.classroom || '');

    const instructorMap = new Map<string, number>();
    const classroomMap = new Map<string, number>();
    const courseNameMap = new Map<string, number>();

    let bestHint: PredictionResult['autoFillHint'] = undefined;

    // 1. If instructor is given, find courses & rooms by this instructor
    if (qInstructor.length > 0) {
      const matchingCourses = this.courses.filter(c => 
        normalizeTurkish(c.instructor).includes(qInstructor)
      );

      matchingCourses.forEach(c => {
        if (c.name) courseNameMap.set(c.name, (courseNameMap.get(c.name) || 0) + 1);
        if (c.classroom) classroomMap.set(c.classroom, (classroomMap.get(c.classroom) || 0) + 1);
      });

      // Best auto-fill hint
      if (matchingCourses.length > 0 && (!current.classroom || !current.name)) {
        const topCourse = matchingCourses[0];
        bestHint = {
          courseName: topCourse.name,
          instructor: topCourse.instructor,
          classroom: topCourse.classroom,
          description: `${topCourse.instructor} hocası genelde ${topCourse.name} dersini ${topCourse.classroom} sınıfında veriyor.`,
        };
      }
    }

    // 2. If course name is given, find instructors & rooms for this course
    if (qName.length > 0) {
      const matchingCourses = this.courses.filter(c => 
        normalizeTurkish(c.name).includes(qName)
      );

      matchingCourses.forEach(c => {
        if (c.instructor) instructorMap.set(c.instructor, (instructorMap.get(c.instructor) || 0) + 1);
        if (c.classroom) classroomMap.set(c.classroom, (classroomMap.get(c.classroom) || 0) + 1);
      });

      if (!bestHint && matchingCourses.length > 0 && (!current.instructor || !current.classroom)) {
        const topCourse = matchingCourses[0];
        bestHint = {
          courseName: topCourse.name,
          instructor: topCourse.instructor,
          classroom: topCourse.classroom,
          description: `${topCourse.name} dersini daha önce ${topCourse.instructor} (${topCourse.classroom}) olarak kaydettiniz.`,
        };
      }
    }

    // 3. If classroom is given, find courses & instructors in this room
    if (qClassroom.length > 0) {
      const matchingCourses = this.courses.filter(c => 
        normalizeTurkish(c.classroom).includes(qClassroom)
      );

      matchingCourses.forEach(c => {
        if (c.instructor) instructorMap.set(c.instructor, (instructorMap.get(c.instructor) || 0) + 1);
        if (c.name) courseNameMap.set(c.name, (courseNameMap.get(c.name) || 0) + 1);
      });
    }

    // 4. Fill in general known values if maps are empty or query is short
    this.courses.forEach(c => {
      if (c.instructor && (qInstructor.length === 0 || normalizeTurkish(c.instructor).includes(qInstructor))) {
        instructorMap.set(c.instructor, (instructorMap.get(c.instructor) || 0) + 1);
      }
      if (c.classroom && (qClassroom.length === 0 || normalizeTurkish(c.classroom).includes(qClassroom))) {
        classroomMap.set(c.classroom, (classroomMap.get(c.classroom) || 0) + 1);
      }
      if (c.name && (qName.length === 0 || normalizeTurkish(c.name).includes(qName))) {
        courseNameMap.set(c.name, (courseNameMap.get(c.name) || 0) + 1);
      }
    });

    // Add common classrooms (D1, D2, D7, etc.) if classroom list is small
    COMMON_CLASSROOMS.forEach(room => {
      if (!classroomMap.has(room) && (qClassroom.length === 0 || normalizeTurkish(room).includes(qClassroom))) {
        classroomMap.set(room, 0);
      }
    });

    // Sort by frequency
    const sortFn = (a: { count: number }, b: { count: number }) => b.count - a.count;

    const suggestedInstructors = Array.from(instructorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort(sortFn)
      .slice(0, 6);

    const suggestedClassrooms = Array.from(classroomMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort(sortFn)
      .slice(0, 10);

    const suggestedCourseNames = Array.from(courseNameMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort(sortFn)
      .slice(0, 6);

    return {
      suggestedInstructors,
      suggestedClassrooms,
      suggestedCourseNames,
      autoFillHint: bestHint,
    };
  }

  /**
   * Returns list of all unique instructors
   */
  public getAllInstructors(): string[] {
    const set = new Set<string>();
    this.courses.forEach(c => {
      if (c.instructor?.trim()) set.add(c.instructor.trim());
    });
    return Array.from(set);
  }

  /**
   * Returns list of all unique classrooms
   */
  public getAllClassrooms(): string[] {
    const set = new Set<string>(COMMON_CLASSROOMS);
    this.courses.forEach(c => {
      if (c.classroom?.trim()) set.add(c.classroom.trim());
    });
    return Array.from(set);
  }

  /**
   * Returns list of all unique course names
   */
  public getAllCourseNames(): string[] {
    const set = new Set<string>();
    this.courses.forEach(c => {
      if (c.name?.trim()) set.add(c.name.trim());
    });
    return Array.from(set);
  }
}
