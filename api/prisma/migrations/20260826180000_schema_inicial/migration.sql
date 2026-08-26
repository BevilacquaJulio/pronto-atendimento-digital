-- CreateTable
CREATE TABLE `Usuario` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `senhaHash` VARCHAR(72) NOT NULL,
    `papel` ENUM('ENFERMEIRO', 'MEDICO', 'ADMIN') NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paciente` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(120) NOT NULL,
    `cpf` CHAR(11) NOT NULL,
    `contato` VARCHAR(40) NOT NULL,
    `nascimento` DATE NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Paciente_cpf_key`(`cpf`),
    INDEX `Paciente_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Atendimento` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('AGUARDANDO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'AGUARDANDO',
    `risco` ENUM('AZUL', 'VERDE', 'AMARELO', 'LARANJA', 'VERMELHO') NULL,
    `pacienteId` CHAR(36) NOT NULL,
    `profissionalId` CHAR(36) NULL,
    `entradaFila` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `iniciadoEm` DATETIME(3) NULL,
    `finalizadoEm` DATETIME(3) NULL,
    `canceladoEm` DATETIME(3) NULL,
    `encaminhadoDeId` CHAR(36) NULL,

    UNIQUE INDEX `Atendimento_encaminhadoDeId_key`(`encaminhadoDeId`),
    INDEX `Atendimento_status_entradaFila_idx`(`status`, `entradaFila`),
    INDEX `Atendimento_pacienteId_idx`(`pacienteId`),
    INDEX `Atendimento_profissionalId_idx`(`profissionalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Triagem` (
    `id` CHAR(36) NOT NULL,
    `atendimentoId` CHAR(36) NOT NULL,
    `queixa` TEXT NOT NULL,
    `pa` VARCHAR(7) NULL,
    `fc` INTEGER NULL,
    `temperatura` DECIMAL(4, 1) NULL,
    `satO2` INTEGER NULL,
    `autorId` CHAR(36) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Triagem_atendimentoId_key`(`atendimentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prontuario` (
    `id` CHAR(36) NOT NULL,
    `atendimentoId` CHAR(36) NOT NULL,
    `autorId` CHAR(36) NOT NULL,
    `anamnese` TEXT NOT NULL,
    `conduta` TEXT NOT NULL,
    `prescricao` TEXT NULL,
    `finalizadoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Prontuario_atendimentoId_key`(`atendimentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProntuarioAdendo` (
    `id` CHAR(36) NOT NULL,
    `prontuarioId` CHAR(36) NOT NULL,
    `autorId` CHAR(36) NOT NULL,
    `texto` TEXT NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProntuarioAdendo_prontuarioId_criadoEm_idx`(`prontuarioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalaToken` (
    `id` CHAR(36) NOT NULL,
    `atendimentoId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `participante` ENUM('PROFISSIONAL', 'PACIENTE') NOT NULL,
    `tipo` ENUM('ACESSO_LIVEKIT', 'LINK_PACIENTE') NOT NULL DEFAULT 'ACESSO_LIVEKIT',
    `usuarioId` CHAR(36) NULL,
    `expiraEm` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `revogadoEm` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SalaToken_tokenHash_key`(`tokenHash`),
    INDEX `SalaToken_atendimentoId_participante_tipo_revogadoEm_idx`(`atendimentoId`, `participante`, `tipo`, `revogadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogAuditoria` (
    `id` CHAR(36) NOT NULL,
    `usuarioId` CHAR(36) NULL,
    `papel` VARCHAR(20) NULL,
    `acao` VARCHAR(60) NOT NULL,
    `pacienteId` CHAR(36) NULL,
    `atendimentoId` CHAR(36) NULL,
    `endpoint` VARCHAR(200) NOT NULL,
    `metodo` VARCHAR(10) NOT NULL,
    `statusHttp` INTEGER NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(300) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LogAuditoria_pacienteId_criadoEm_idx`(`pacienteId`, `criadoEm`),
    INDEX `LogAuditoria_usuarioId_criadoEm_idx`(`usuarioId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_encaminhadoDeId_fkey` FOREIGN KEY (`encaminhadoDeId`) REFERENCES `Atendimento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Atendimento` ADD CONSTRAINT `Atendimento_profissionalId_fkey` FOREIGN KEY (`profissionalId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Triagem` ADD CONSTRAINT `Triagem_atendimentoId_fkey` FOREIGN KEY (`atendimentoId`) REFERENCES `Atendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Triagem` ADD CONSTRAINT `Triagem_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prontuario` ADD CONSTRAINT `Prontuario_atendimentoId_fkey` FOREIGN KEY (`atendimentoId`) REFERENCES `Atendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prontuario` ADD CONSTRAINT `Prontuario_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProntuarioAdendo` ADD CONSTRAINT `ProntuarioAdendo_prontuarioId_fkey` FOREIGN KEY (`prontuarioId`) REFERENCES `Prontuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProntuarioAdendo` ADD CONSTRAINT `ProntuarioAdendo_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalaToken` ADD CONSTRAINT `SalaToken_atendimentoId_fkey` FOREIGN KEY (`atendimentoId`) REFERENCES `Atendimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalaToken` ADD CONSTRAINT `SalaToken_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAuditoria` ADD CONSTRAINT `LogAuditoria_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAuditoria` ADD CONSTRAINT `LogAuditoria_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAuditoria` ADD CONSTRAINT `LogAuditoria_atendimentoId_fkey` FOREIGN KEY (`atendimentoId`) REFERENCES `Atendimento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
