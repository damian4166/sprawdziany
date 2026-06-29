const TEACHER_LOGIN = 'test';
const TEACHER_PASSWORD = 'test';

export function isTeacherCredentialsValid(login, password) {
  return login.trim() === TEACHER_LOGIN && password.trim() === TEACHER_PASSWORD;
}
