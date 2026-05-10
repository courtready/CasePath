// ---------- STATE STORAGE ----------
export function getUserState() {
  return localStorage.getItem("user_state") || "NSW"
}

export function setUserState(state) {
  localStorage.setItem("user_state", state)
}
