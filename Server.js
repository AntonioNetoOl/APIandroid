require('dotenv').config({ path: './API.env' });

const express = require('express');
const sql = require('mssql');
const crypto = require('crypto');
const app = express();

app.use(express.json());


const sqlConfig = {
    server: 'localhost', 
    instanceName: 'SQLEXPRESS', 
    database: 'Mobile',
    user: 'Terraverde.unip.pim',
    password: 'Unip1234',
    port: 1433,
    options: {
        encrypt: false, 
        enableArithAbort: true
    }
};




const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

app.post('/login', async (req, res) => {
    console.log("Requisição recebida em /login");
    try {
        const { email, senha } = req.body;
        console.log("Dados recebidos:", email, senha);

        if (!email || !senha) {
            console.log("Faltando email ou senha");
            return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });
        }

        await sql.connect(sqlConfig);
        console.log("Conectado ao banco de dados");

        const request = new sql.Request();
        request.input('Email', sql.VarChar, email);
        const result = await request.query(`
          SELECT senha 
          FROM usuario
          WHERE email = @Email`);
        console.log("Resultado da consulta:", result);

        if (result.recordset.length === 0) {
            console.log("Usuário não encontrado");
            return res.status(400).json({ success: false, message: 'Email não encontrado' });
        }

        const storedPassword = result.recordset[0].senha;
        console.log("Senha recebida:", senha, "Senha armazenada:", storedPassword);

        if (senha === storedPassword) {
            console.log("Login bem-sucedido");
            res.json({ success: true, message: 'Login bem-sucedido!' });
        } else {
            console.log("Senha incorreta");
            res.json({ success: false, message: 'Email ou senha incorretos' });
        }
    } catch (err) {
        console.error('Erro de conexão:', err);
        res.status(500).json({ success: false, message: 'Erro ao conectar ao banco de dados' });
    }
});

app.post('/insumos', async (req, res) => {
    try {
        const { NomeInsumo, Origem } = req.body;

        if (!NomeInsumo || !Origem) {
            return res.status(400).json({ success: false, message: 'Nome do insumo e origem são obrigatórios.' });
        }

        await sql.connect(sqlConfig);
        const request = new sql.Request();
        request.input('NomeInsumo', sql.VarChar, NomeInsumo);
        request.input('Origem', sql.VarChar, Origem);

        
        await request.execute('InserirInsumo');

        console.log('Insumo cadastrado:', NomeInsumo, Origem);
        res.status(201).json({ success: true, message: 'Insumo cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao cadastrar insumo:', err);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar insumo no banco de dados.' });
    }
});

app.post('/clientes', async (req, res) => {
    try {
        const { RazaoSocial, Cnpj } = req.body;

        if (!RazaoSocial || !Cnpj) {
            return res.status(400).json({ success: false, message: 'Razão Social e CNPJ são obrigatórios.' });
        }

        await sql.connect(sqlConfig);
        const request = new sql.Request(); 

        
        request.input('Cnpj', sql.VarChar, Cnpj);
        const result = await request.query(`
            SELECT COUNT(*) AS count 
            FROM cliente 
            WHERE CnpjCliente = @Cnpj
        `);

        if (result.recordset[0].count > 0) {
            return res.status(400).json({ success: false, message: 'CNPJ já cadastrado.' });
        }

        
        request.input('RazaoSocial', sql.VarChar, RazaoSocial);

        
        await request.execute('CadastroCliente');

        console.log('Cliente cadastrado:', RazaoSocial, Cnpj);
        res.status(201).json({ success: true, message: 'Cliente cadastrado com sucesso!' });
    } catch (err) {
        console.error('Erro ao cadastrar cliente:', err);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar cliente no banco de dados.' });
    }
});

app.post('/registrar-venda', async (req, res) => {
    try {
        const { Nome, NomeProduto, quantidade, total, formaPagamento } = req.body;

        if (!Nome || !NomeProduto|| !quantidade || !total || !formaPagamento) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }

        await sql.connect(sqlConfig);
        const request = new sql.Request();

        request.input('Nome', sql.Int, Nome);
        request.input('NomeProduto', sql.Int, NomeProduto);
        request.input('Quantidade', sql.Int, quantidade);
        request.input('Total', sql.Decimal(10, 2), total);
        request.input('FormaPagamento', sql.Int, formaPagamento);

        
        await request.execute('RegistrarVenda');

        res.status(201).json({ success: true, message: 'Venda registrada com sucesso!' });
    } catch (err) {
        console.error('Erro ao registrar venda:', err);
        res.status(500).json({ success: false, message: 'Erro ao registrar venda no banco de dados.' });
    }
});

app.get('/clientes', async (req, res) => {
    try {

        await sql.connect(sqlConfig);
        

        const result = await sql.query('SELECT Nome FROM cliente');
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar clientes');
    }
});


app.get('/produtos', async (req, res) => {
    try {

        await sql.connect(sqlConfig);

        const result = await sql.query('SELECT NomeProduto FROM Produto');
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar produtos');
    }
});


app.get('/formas-pagamento', async (req, res) => {
    try {

        await sql.connect(sqlConfig);

        const result = await sql.query('SELECT  FormaPagamento FROM FormaPagamento');
        res.json(result.recordset);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar formas de pagamento');
    }
});

app.get('/relatorio-vendas', async (req, res) => {
    try {
        const { dataInicial } = req.query;

        if (!dataInicial) {
            console.log('Erro: Data inicial não fornecida.');
            return res.status(400).json({ success: false, message: 'Data inicial é obrigatória.' });
        }

        
        await sql.connect(sqlConfig);
        console.log('Conexão com o banco de dados estabelecida para relatório.');

        
        const request = new sql.Request();
        request.input('DataInicial', sql.DateTime, new Date(dataInicial)); 

        console.log('Executando procedimento armazenado: RelatorioVendasPorData');
        const result = await request.execute('RelatorioVendasPorData');

        
        if (result.recordset.length === 0) {
            console.log('Nenhuma venda encontrada no intervalo fornecido.');
            return res.status(404).json({ success: true, message: 'Nenhuma venda encontrada no intervalo fornecido.' });
        }

        console.log('Relatório de vendas recuperado com sucesso.');
        res.json({ success: true, data: result.recordset });
    } catch (error) {
        console.error('Erro ao buscar relatório de vendas:', error.message || error);
        res.status(500).json({ success: false, message: 'Erro ao buscar relatório de vendas.', error: error.message });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(5000, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
