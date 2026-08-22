export const regions = [
  { id: 'REG-001', name: 'Tamil Nadu South', state: 'Tamil Nadu', districts: 4, centres: 25, students: 850, status: 'Active' },
  { id: 'REG-002', name: 'Tamil Nadu North', state: 'Tamil Nadu', districts: 4, centres: 20, students: 620, status: 'Active' },
  { id: 'REG-003', name: 'Karnataka', state: 'Karnataka', districts: 3, centres: 15, students: 480, status: 'Active' },
  { id: 'REG-004', name: 'Andhra Pradesh', state: 'Andhra Pradesh', districts: 4, centres: 18, students: 540, status: 'Active' },
  { id: 'REG-005', name: 'Kerala', state: 'Kerala', districts: 3, centres: 12, students: 380, status: 'Active' },
];

export const districts = [
  { id: 'DIST-001', name: 'Madurai', regionId: 'REG-001', region: 'Tamil Nadu South', centres: 8, students: 250, status: 'Active' },
  { id: 'DIST-002', name: 'Dindigul', regionId: 'REG-001', region: 'Tamil Nadu South', centres: 6, students: 180, status: 'Active' },
  { id: 'DIST-003', name: 'Virudhunagar', regionId: 'REG-001', region: 'Tamil Nadu South', centres: 5, students: 200, status: 'Active' },
  { id: 'DIST-004', name: 'Tirunelveli', regionId: 'REG-001', region: 'Tamil Nadu South', centres: 6, students: 220, status: 'Active' },
  { id: 'DIST-005', name: 'Chennai', regionId: 'REG-002', region: 'Tamil Nadu North', centres: 7, students: 240, status: 'Active' },
  { id: 'DIST-006', name: 'Kanchipuram', regionId: 'REG-002', region: 'Tamil Nadu North', centres: 5, students: 160, status: 'Active' },
  { id: 'DIST-007', name: 'Vellore', regionId: 'REG-002', region: 'Tamil Nadu North', centres: 4, students: 110, status: 'Active' },
  { id: 'DIST-008', name: 'Tiruvallur', regionId: 'REG-002', region: 'Tamil Nadu North', centres: 4, students: 110, status: 'Active' },
  { id: 'DIST-009', name: 'Bangalore Rural', regionId: 'REG-003', region: 'Karnataka', centres: 7, students: 220, status: 'Active' },
  { id: 'DIST-010', name: 'Mysuru', regionId: 'REG-003', region: 'Karnataka', centres: 5, students: 160, status: 'Active' },
  { id: 'DIST-011', name: 'Tumkur', regionId: 'REG-003', region: 'Karnataka', centres: 3, students: 100, status: 'Active' },
  { id: 'DIST-012', name: 'Nellore', regionId: 'REG-004', region: 'Andhra Pradesh', centres: 5, students: 150, status: 'Active' },
  { id: 'DIST-013', name: 'Chittoor', regionId: 'REG-004', region: 'Andhra Pradesh', centres: 6, students: 180, status: 'Active' },
  { id: 'DIST-014', name: 'Kadapa', regionId: 'REG-004', region: 'Andhra Pradesh', centres: 4, students: 110, status: 'Active' },
  { id: 'DIST-015', name: 'Kurnool', regionId: 'REG-004', region: 'Andhra Pradesh', centres: 3, students: 100, status: 'Active' },
  { id: 'DIST-016', name: 'Thiruvananthapuram', regionId: 'REG-005', region: 'Kerala', centres: 5, students: 160, status: 'Active' },
  { id: 'DIST-017', name: 'Palakkad', regionId: 'REG-005', region: 'Kerala', centres: 4, students: 120, status: 'Active' },
  { id: 'DIST-018', name: 'Thrissur', regionId: 'REG-005', region: 'Kerala', centres: 3, students: 100, status: 'Active' },
];

export const centres = [
  { id: 'CEN-001', name: 'Madurai Centre A', type: 'Urban', region: 'Tamil Nadu South', district: 'Madurai', village: 'Tallakulam', facilitator: 'Meera Nair', startDate: '2023-01-15', status: 'Active', students: 45, attendance: 92, avgScore: 78, highRisk: 2 },
  { id: 'CEN-002', name: 'Madurai Centre B', type: 'Semi-Urban', region: 'Tamil Nadu South', district: 'Madurai', village: 'Thiruparankundram', facilitator: 'Siva Kumar', startDate: '2023-03-10', status: 'Active', students: 38, attendance: 85, avgScore: 71, highRisk: 4 },
  { id: 'CEN-003', name: 'Dindigul Community Centre', type: 'Rural', region: 'Tamil Nadu South', district: 'Dindigul', village: 'Vadamadurai', facilitator: 'Raja Raman', startDate: '2023-06-01', status: 'Active', students: 50, attendance: 88, avgScore: 65, highRisk: 6 },
  { id: 'CEN-004', name: 'Chennai North Centre', type: 'Urban', region: 'Tamil Nadu North', district: 'Chennai', village: 'Vyasarpadi', facilitator: 'Dinesh Raj', startDate: '2022-11-20', status: 'Active', students: 60, attendance: 81, avgScore: 68, highRisk: 10 },
  { id: 'CEN-005', name: 'Bangalore Rural Hub', type: 'Rural', region: 'Karnataka', district: 'Bangalore Rural', village: 'Devanahalli', facilitator: 'Sujatha Krishnaswamy', startDate: '2023-08-05', status: 'Active', students: 42, attendance: 90, avgScore: 74, highRisk: 3 },
  { id: 'CEN-006', name: 'Nellore Learning Centre', type: 'Semi-Urban', region: 'Andhra Pradesh', district: 'Nellore', village: 'Kavali', facilitator: 'Preethi Selvam', startDate: '2023-02-18', status: 'Active', students: 35, attendance: 94, avgScore: 82, highRisk: 1 },
  { id: 'CEN-007', name: 'Thiruvananthapuram Centre', type: 'Urban', region: 'Kerala', district: 'Thiruvananthapuram', village: 'Pattom', facilitator: 'Anjali Menon', startDate: '2023-05-12', status: 'Active', students: 48, attendance: 96, avgScore: 85, highRisk: 0 },
  { id: 'CEN-008', name: 'Kanchipuram Centre', type: 'Rural', region: 'Tamil Nadu North', district: 'Kanchipuram', village: 'Uthiramerur', facilitator: 'Gopi Chand', startDate: '2023-09-01', status: 'Active', students: 30, attendance: 82, avgScore: 62, highRisk: 5 },
  { id: 'CEN-009', name: 'Virudhunagar Centre', type: 'Semi-Urban', region: 'Tamil Nadu South', district: 'Virudhunagar', village: 'Sivakasi', facilitator: 'Kamala Hasan', startDate: '2022-12-10', status: 'Active', students: 40, attendance: 87, avgScore: 76, highRisk: 2 },
  { id: 'CEN-010', name: 'Vellore Centre', type: 'Urban', region: 'Tamil Nadu North', district: 'Vellore', village: 'Katpadi', facilitator: 'Ramesh Babu', startDate: '2023-07-22', status: 'Active', students: 55, attendance: 89, avgScore: 70, highRisk: 4 },
];

export const students = [
  { id: 'VGE-2024-001', name: 'Priya Ramesh', gender: 'F', age: 12, class: '7', centre: 'Madurai Centre A', region: 'Tamil Nadu South', district: 'Madurai', attendancePercent: 95, academicScore: 82, vulnerabilities: ['First Generation Learner'], status: 'Active', date: '2024-01-15' },
  { id: 'VGE-2024-002', name: 'Karthik Selvam', gender: 'M', age: 15, class: '10', centre: 'Chennai North Centre', region: 'Tamil Nadu North', district: 'Chennai', attendancePercent: 78, academicScore: 65, vulnerabilities: ['Single Parent Family', 'Child Labour Risk'], status: 'Active', date: '2024-01-16' },
  { id: 'VGE-2024-003', name: 'Anitha Devi', gender: 'F', age: 9, class: '4', centre: 'Dindigul Community Centre', region: 'Tamil Nadu South', district: 'Dindigul', attendancePercent: 88, academicScore: 70, vulnerabilities: ['Extreme Poverty'], status: 'Active', date: '2024-01-17' },
  { id: 'VGE-2024-004', name: 'Murugan Pillai', gender: 'M', age: 14, class: '9', centre: 'Bangalore Rural Hub', region: 'Karnataka', district: 'Bangalore Rural', attendancePercent: 92, academicScore: 88, vulnerabilities: [], status: 'Active', date: '2024-01-18' },
  { id: 'VGE-2024-005', name: 'Lakshmi Venkataraman', gender: 'F', age: 11, class: '6', centre: 'Nellore Learning Centre', region: 'Andhra Pradesh', district: 'Nellore', attendancePercent: 98, academicScore: 92, vulnerabilities: ['First Generation Learner'], status: 'Active', date: '2024-01-19' },
  { id: 'VGE-2024-006', name: 'Rajesh Kumar', gender: 'M', age: 16, class: '11', centre: 'Thiruvananthapuram Centre', region: 'Kerala', district: 'Thiruvananthapuram', attendancePercent: 96, academicScore: 85, vulnerabilities: [], status: 'Active', date: '2024-01-20' },
  { id: 'VGE-2024-007', name: 'Meenakshi Sundaram', gender: 'F', age: 8, class: '3', centre: 'Madurai Centre B', region: 'Tamil Nadu South', district: 'Madurai', attendancePercent: 82, academicScore: 74, vulnerabilities: ['Migrant Family'], status: 'Active', date: '2024-01-21' },
  { id: 'VGE-2024-008', name: 'Suresh Babu', gender: 'M', age: 13, class: '8', centre: 'Kanchipuram Centre', region: 'Tamil Nadu North', district: 'Kanchipuram', attendancePercent: 70, academicScore: 58, vulnerabilities: ['Orphan (one parent)', 'Extreme Poverty'], status: 'Active', date: '2024-01-22' },
  { id: 'VGE-2024-009', name: 'Kavitha Rajan', gender: 'F', age: 10, class: '5', centre: 'Virudhunagar Centre', region: 'Tamil Nadu South', district: 'Virudhunagar', attendancePercent: 89, academicScore: 76, vulnerabilities: [], status: 'Active', date: '2024-01-23' },
  { id: 'VGE-2024-010', name: 'Dinesh Chandrasekhar', gender: 'M', age: 17, class: '12', centre: 'Vellore Centre', region: 'Tamil Nadu North', district: 'Vellore', attendancePercent: 85, academicScore: 80, vulnerabilities: ['First Generation Learner'], status: 'Active', date: '2024-01-24' },
  { id: 'VGE-2024-011', name: 'Saranya Murugesan', gender: 'F', age: 7, class: '2', centre: 'Madurai Centre A', region: 'Tamil Nadu South', district: 'Madurai', attendancePercent: 94, academicScore: 78, vulnerabilities: [], status: 'Active', date: '2024-01-25' },
  { id: 'VGE-2024-012', name: 'Balachandran Iyer', gender: 'M', age: 14, class: '9', centre: 'Chennai North Centre', region: 'Tamil Nadu North', district: 'Chennai', attendancePercent: 65, academicScore: 52, vulnerabilities: ['Substance Abuse in Family', 'Domestic Violence Exposure'], status: 'Warning', date: '2024-01-26' },
  { id: 'VGE-2024-013', name: 'Nirmala Krishnan', gender: 'F', age: 11, class: '6', centre: 'Bangalore Rural Hub', region: 'Karnataka', district: 'Bangalore Rural', attendancePercent: 91, academicScore: 84, vulnerabilities: ['First Generation Learner'], status: 'Active', date: '2024-01-27' },
  { id: 'VGE-2024-014', name: 'Vignesh Pandian', gender: 'M', age: 9, class: '4', centre: 'Madurai Centre B', region: 'Tamil Nadu South', district: 'Madurai', attendancePercent: 86, academicScore: 72, vulnerabilities: ['Extreme Poverty'], status: 'Active', date: '2024-01-28' },
  { id: 'VGE-2024-015', name: 'Poorvika Narayanan', gender: 'F', age: 15, class: '10', centre: 'Nellore Learning Centre', region: 'Andhra Pradesh', district: 'Nellore', attendancePercent: 97, academicScore: 94, vulnerabilities: [], status: 'Active', date: '2024-01-29' },
  { id: 'VGE-2024-016', name: 'Senthilkumar Arumugam', gender: 'M', age: 12, class: '7', centre: 'Dindigul Community Centre', region: 'Tamil Nadu South', district: 'Dindigul', attendancePercent: 75, academicScore: 60, vulnerabilities: ['Child Labour Risk', 'Migrant Family'], status: 'Warning', date: '2024-01-30' },
  { id: 'VGE-2024-017', name: 'Deepika Balaji', gender: 'F', age: 10, class: '5', centre: 'Thiruvananthapuram Centre', region: 'Kerala', district: 'Thiruvananthapuram', attendancePercent: 98, academicScore: 90, vulnerabilities: [], status: 'Active', date: '2024-01-31' },
  { id: 'VGE-2024-018', name: 'Arun Prakash', gender: 'M', age: 16, class: '11', centre: 'Kanchipuram Centre', region: 'Tamil Nadu North', district: 'Kanchipuram', attendancePercent: 72, academicScore: 55, vulnerabilities: ['Orphan (both parents)'], status: 'Warning', date: '2024-02-01' },
  { id: 'VGE-2024-019', name: 'Revathi Subramaniam', gender: 'F', age: 8, class: '3', centre: 'Virudhunagar Centre', region: 'Tamil Nadu South', district: 'Virudhunagar', attendancePercent: 90, academicScore: 77, vulnerabilities: ['First Generation Learner'], status: 'Active', date: '2024-02-02' },
  { id: 'VGE-2024-020', name: 'Gopalakrishnan Nair', gender: 'M', age: 13, class: '8', centre: 'Vellore Centre', region: 'Tamil Nadu North', district: 'Vellore', attendancePercent: 88, academicScore: 81, vulnerabilities: [], status: 'Active', date: '2024-02-03' },
];


export const activities = [
  { id: 1, text: 'Meera Nair submitted attendance for Madurai Centre A', time: '2 hours ago', icon: 'attendance' },
  { id: 2, text: 'New student Anitha Devi registered at Dindigul Centre', time: '4 hours ago', icon: 'student' },
  { id: 3, text: 'Q1 Assessments updated for Bangalore Rural Hub', time: 'Yesterday', icon: 'assessment' },
  { id: 4, text: 'Rajan Pillai generated TN South Monthly Report', time: 'Yesterday', icon: 'report' },
  { id: 5, text: 'New centre added in Tirunelveli district', time: '2 days ago', icon: 'centre' },
  { id: 6, text: 'Low attendance alert: Karthik Selvam (< 80%)', time: '2 days ago', icon: 'alert' },
];
