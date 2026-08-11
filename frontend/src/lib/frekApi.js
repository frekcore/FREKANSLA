import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const getIdentity = () => api.get("/identity").then((r) => r.data);
export const createSession = (payload) => api.post("/sessions", payload).then((r) => r.data);
export const certify = (payload) => api.post("/certify", payload).then((r) => r.data);
export const listObjects = () => api.get("/objects").then((r) => r.data);
export const getObject = (id) => api.get(`/objects/${id}`).then((r) => r.data);
export const getProvenance = (id) => api.get(`/objects/${id}/provenance`).then((r) => r.data);
export const publishObject = (id) => api.post(`/objects/${id}/publish`).then((r) => r.data);
export const verifyObject = (id) => api.get(`/objects/${id}/verify`).then((r) => r.data);
export const verifyRaw = (fk_object) => api.post("/verify", { fk_object }).then((r) => r.data);
export const runDiagnostics = (payload) => api.post("/diagnostics", payload).then((r) => r.data);
export const downloadUrl = (id) => `${API}/objects/${id}/download`;
