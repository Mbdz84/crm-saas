"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const client_1 = __importDefault(require("../../prisma/client"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
async function register(req, res) {
    try {
        const { email, password, name, companyName } = req.body;
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const company = await client_1.default.company.create({
            data: { name: companyName },
        });
        const user = await client_1.default.user.create({
            data: {
                email,
                password: hashed,
                name,
                role: "admin",
                companyId: company.id,
            },
        });
        return res.json({ message: "Registration successful", user, company });
    }
    catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await client_1.default.user.findUnique({
            where: { email },
            include: { company: true },
        });
        if (!user)
            return res.status(400).json({ error: "Invalid email" });
        const match = await bcryptjs_1.default.compare(password, user.password);
        if (!match)
            return res.status(400).json({ error: "Invalid password" });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, companyId: user.companyId, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
        // Determine cookie domain dynamically for local dev
        const domain = req.hostname === "localhost" ||
            req.hostname.startsWith("127.") ||
            req.hostname.startsWith("10.") ||
            req.hostname.startsWith("192.168.")
            ? undefined
            : req.hostname;
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // HTTPS → true, local → false
            sameSite: "lax", // Lax works with same-host navigation
            path: "/",
        });
        res.json({ message: "Logged in", user });
    }
    catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
}
async function me(req, res) {
    res.json({ user: req.user });
}
