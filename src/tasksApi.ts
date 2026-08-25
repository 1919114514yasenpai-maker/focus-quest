import { getAccessToken } from './firebase';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

export interface TaskList {
  id: string;
  title: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getAccessToken();
  if (!token) throw new Error("No Google Tasks access token found. Please login again.");

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Google Tasks API Error: ${response.status} ${err.error?.message || response.statusText}`);
  }
  
  return response.json();
}

export async function getTaskLists(): Promise<TaskList[]> {
  try {
    const data = await fetchWithAuth(`${TASKS_API_BASE}/users/@me/lists`);
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch task lists:", error);
    return [];
  }
}

export async function getTasks(taskListId: string): Promise<GoogleTask[]> {
  try {
    const data = await fetchWithAuth(`${TASKS_API_BASE}/lists/${taskListId}/tasks?showCompleted=false&showHidden=false`);
    return data.items || [];
  } catch (error) {
    console.error(`Failed to fetch tasks for list ${taskListId}:`, error);
    return [];
  }
}

export async function createTask(taskListId: string, title: string, notes?: string): Promise<GoogleTask | null> {
  try {
    const data = await fetchWithAuth(`${TASKS_API_BASE}/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes }),
    });
    return data;
  } catch (error) {
    console.error(`Failed to create task in list ${taskListId}:`, error);
    return null;
  }
}

export async function completeTask(taskListId: string, taskId: string): Promise<void> {
  try {
    const taskData = await fetchWithAuth(`${TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`);
    taskData.status = 'completed';
    await fetchWithAuth(`${TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
  } catch (error) {
    console.error(`Failed to complete task ${taskId}:`, error);
  }
}
