
import {
    initializeApp,
    getApps,
    getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdwwjbpyvTU5afvNzcHaBm-T-ShueHicU",
    authDomain: "neo-flux-c91c8.firebaseapp.com",
    projectId: "neo-flux-c91c8",
    storageBucket: "neo-flux-c91c8.firebasestorage.app",
    messagingSenderId: "6686219198",
    appId: "1:6686219198:web:e2f0b16808e5f3d251b7ef"
};

const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
