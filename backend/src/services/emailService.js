import nodemailer from 'nodemailer';
import 'dotenv/config';

// Validação de ambiente para alertar caso falte configuração
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.FRONTEND_URL) {
    console.error('[emailService] AVISO: Variáveis de ambiente de e-mail ausentes (EMAIL_USER, EMAIL_PASS ou FRONTEND_URL). O envio de e-mails pode falhar.');
}

const remetente = `"Arte Digital Floripa" <${process.env.EMAIL_USER}>`;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function enviarEmailBoasVindas(email, token) {
    try {
        await transporter.sendMail({
            from: remetente,
            to: email,
            subject: 'Bem-vindo ao Arte Digital Floripa',
            html: `
                <h1>Olá, seja bem-vindo!</h1>
                <p>Sua conta foi criada na plataforma Arte Digital Floripa.</p>
                <p><b>Email:</b> ${email}</p>
                <p>Para acessar o portal, clique no botão abaixo e crie sua senha:</p>
                <a href="${process.env.FRONTEND_URL}/completar-cadastro?token=${token}">Criar minha senha</a>
            `
        });
    } catch (error) {
        // Abordagem Best-Effort: Loga o erro, mas não quebra o fluxo de cadastro
        console.error('[emailService] Falha ao enviar e-mail de boas-vindas:', { email, erro: error.message });
    }
}

async function enviarEmailRecuperarSenha(email, token) {
    try {
        await transporter.sendMail({
            from: remetente,
            to: email,
            subject: 'Recuperação de senha',
            html: `
                <h1>Recuperação de senha</h1>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Arte Digital Floripa.</p>
                <p><b>Email:</b> ${email}</p>
                <p>Clique no link abaixo para criar uma nova senha:</p>
                <a href="${process.env.FRONTEND_URL}/recuperar-senha?token=${token}">Redefinir minha senha</a>
                <p>Este link expira em 24 horas. Se você não solicitou a recuperação de senha, ignore este email.</p>
            `
        });
    } catch (error) {
        // Falha crítica: Sem o email o usuário não recupera a senha
        console.error('[emailService] Falha ao enviar e-mail de recuperação:', { email, erro: error.message });
        const erroEnvio = new Error('Falha ao enviar e-mail de recuperação. Tente novamente mais tarde.');
        erroEnvio.statusCode = 500;
        throw erroEnvio;
    }
}

export default {
    enviarEmailBoasVindas,
    enviarEmailRecuperarSenha
};