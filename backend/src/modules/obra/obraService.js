import prisma from '../../db/prisma.js';

function parseId(valor, nomeCampo) {
    const id = parseInt(valor);
    if (Number.isNaN(id)) {
        const erro = new Error(`Id inválido: ${nomeCampo}`);
        erro.statusCode = 400;
        throw erro;
    }
    return id;
}

async function listarObras({ categoria, autor, titulo } = {}) {
    const where = {};
    if (categoria) {
        where.categoria = categoria;
    }
    if (autor) {
        const autorData = await prisma.autor.findFirst({
            where: { nome_publico: autor }
        });
        if (!autorData) {
            return [];
        }
        where.autor_acervo = { some: { id_autor: autorData.id_autor } };
    }
    if (titulo) {
        where.titulo = { contains: titulo, mode: 'insensitive' };
    }
    return await prisma.acervo.findMany({
        where,
        include: { midia3d: true, usuario_acervo: true, autor_acervo: { include: { autor: true } } }
    });
}

async function listarObraPorId(id) {
    parseId(id, 'id_obra');
    return await prisma.acervo.findUnique({
        where: { id_obra: parseInt(id) },
        include: { midia3d: true, usuario_acervo: true, autor_acervo: { include: { autor: true } } }
    });
}

async function criarObra(dados) {
    if (!dados || !dados.titulo || dados.titulo.trim() === '') {
        const erro = new Error('Título da obra é obrigatório.');
        erro.statusCode = 400;
        throw erro;
    }

    
    if (dados.autoresIds && dados.autoresIds.length) {
        const idsValidos = dados.autoresIds.every(id => !Number.isNaN(parseInt(id)));
        if (!idsValidos) {
            const erro = new Error('Id inválido: autoresIds');
            erro.statusCode = 400;
            throw erro;
        }
        const autoresExistentes = await prisma.autor.findMany({
            where: { id_autor: { in: dados.autoresIds.map(id => parseInt(id)) } }
        });
        if (autoresExistentes.length !== dados.autoresIds.length) {
            const erro = new Error('Um ou mais autores informados não existem.');
            erro.statusCode = 404;
            throw erro;
        }
    }

    if (dados.usuariosIds && dados.usuariosIds.length) {
        const idsValidos = dados.usuariosIds.every(id => !Number.isNaN(parseInt(id)));
        if (!idsValidos) {
            const erro = new Error('Id inválido: usuariosIds');
            erro.statusCode = 400;
            throw erro;
        }
        const usuariosExistentes = await prisma.usuario.findMany({
            where: { id_usuario: { in: dados.usuariosIds.map(id => parseInt(id)) } }
        });
        if (usuariosExistentes.length !== dados.usuariosIds.length) {
            const erro = new Error('Um ou mais usuários informados não existem.');
            erro.statusCode = 404;
            throw erro;
        }
    }

    if (dados.midias3d && dados.midias3d.length) {
        const midiasValidas = dados.midias3d.every(
            m => m && m.nome_arquivo && m.arquivo !== undefined && m.arquivo !== null && m.arquivo !== ''
        );
        if (!midiasValidas) {
            const erro = new Error('Dados de mídia 3D inválidos. É necessário nome_arquivo e arquivo.');
            erro.statusCode = 400;
            throw erro;
        }
        const arquivosValidos = dados.midias3d.every(m => {
            try {
                return Buffer.from(m.arquivo).length >= 0;
            } catch {
                return false;
            }
        });
        if (!arquivosValidos) {
            const erro = new Error('Arquivo de mídia 3D inválido.');
            erro.statusCode = 400;
            throw erro;
        }
    }

    const obra = await prisma.acervo.create({
        data: {
            titulo: dados.titulo.trim(),
            data_criacao: dados.data ? new Date(dados.data) : null,
            descricao: dados.descricao || null,
            categoria: dados.categoria || null,
            midia3d: dados.midias3d && dados.midias3d.length
                ? { create: dados.midias3d.map(m => ({ nome_arquivo: m.nome_arquivo, arquivo: Buffer.from(m.arquivo) })) }
                : undefined,
            usuario_acervo: dados.usuariosIds && dados.usuariosIds.length
                ? { create: dados.usuariosIds.map(id => ({ id_usuario: parseInt(id) })) }
                : undefined,
            autor_acervo: dados.autoresIds && dados.autoresIds.length
                ? { create: dados.autoresIds.map(id => ({ id_autor: parseInt(id) })) }
                : undefined
        },
        include: { midia3d: true, usuario_acervo: true, autor_acervo: true }
    });
    return obra;
}

async function atualizarObra(id, dados) {
    const idObra = parseId(id, 'id_obra');

    const obraExiste = await prisma.acervo.findUnique({
        where: { id_obra: idObra },
        select: { id_obra: true }
    });
    if (!obraExiste) {
        const erro = new Error('Registro não encontrado.');
        erro.statusCode = 404;
        throw erro;
    }


    if (dados.autoresIds && dados.autoresIds.length) {
        const idsValidos = dados.autoresIds.every(id => !Number.isNaN(parseInt(id)));
        if (!idsValidos) {
            const erro = new Error('Id inválido: autoresIds');
            erro.statusCode = 400;
            throw erro;
        }
        const autoresExistentes = await prisma.autor.findMany({
            where: { id_autor: { in: dados.autoresIds.map(id => parseInt(id)) } }
        });
        if (autoresExistentes.length !== dados.autoresIds.length) {
            const erro = new Error('Um ou mais autores informados não existem.');
            erro.statusCode = 404;
            throw erro;
        }
    }

    if (dados.usuariosIds && dados.usuariosIds.length) {
        const idsValidos = dados.usuariosIds.every(id => !Number.isNaN(parseInt(id)));
        if (!idsValidos) {
            const erro = new Error('Id inválido: usuariosIds');
            erro.statusCode = 400;
            throw erro;
        }
        const usuariosExistentes = await prisma.usuario.findMany({
            where: { id_usuario: { in: dados.usuariosIds.map(id => parseInt(id)) } }
        });
        if (usuariosExistentes.length !== dados.usuariosIds.length) {
            const erro = new Error('Um ou mais usuários informados não existem.');
            erro.statusCode = 404;
            throw erro;
        }
    }

    if (dados.midias3d && dados.midias3d.length) {
        const midiasValidas = dados.midias3d.every(
            m => m && m.nome_arquivo && m.arquivo !== undefined
        );
        if (!midiasValidas) {
            const erro = new Error('Dados de mídia 3D inválidos. É necessário nome_arquivo e arquivo.');
            erro.statusCode = 400;
            throw erro;
        }
    }

    const { midias3d, usuariosIds, autoresIds, data, idUsuario, ...acervoData } = dados;

    await prisma.$transaction(async (tx) => {
        if (midias3d && midias3d.length) {
            await tx.midia3d.deleteMany({ where: { id_obra: idObra } });
            await tx.midia3d.createMany({
                data: midias3d.map(m => ({
                    id_obra: idObra,
                    nome_arquivo: m.nome_arquivo,
                    arquivo: Buffer.from(m.arquivo)
                }))
            });
        }
        if (usuariosIds) {
            await tx.usuario_acervo.deleteMany({ where: { id_obra: idObra } });
            await tx.usuario_acervo.createMany({
                data: usuariosIds.map(uid => ({ id_obra: idObra, id_usuario: parseInt(uid) }))
            });
        }
        if (autoresIds) {
            await tx.autor_acervo.deleteMany({ where: { id_obra: idObra } });
            await tx.autor_acervo.createMany({
                data: autoresIds.map(aid => ({ id_obra: idObra, id_autor: parseInt(aid) }))
            });
        }

        await tx.acervo.update({
            where: { id_obra: idObra },
            data: {
                ...acervoData,
                titulo: acervoData.titulo ? acervoData.titulo.trim() : undefined,
                data_criacao: acervoData.data ? new Date(acervoData.data) : undefined
            }
        });
    });

    return await prisma.acervo.findUnique({
        where: { id_obra: idObra },
        include: { midia3d: true, usuario_acervo: true, autor_acervo: true }
    });
}

async function deletarObra(id) {
    const idObra = parseId(id, 'id_obra');
    await prisma.acervo.delete({
        where: { id_obra: idObra }
    });
}

export default {
    listarObras,
    listarObraPorId,
    criarObra,
    atualizarObra,
    deletarObra
};
