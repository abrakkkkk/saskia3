-- Novos cargos: fisioterapeuta e odontologo (inclui bucomaxilofacial). So adiciona valores ao enum.
ALTER TYPE "CargoUsuario" ADD VALUE IF NOT EXISTS 'FISIOTERAPEUTA';
ALTER TYPE "CargoUsuario" ADD VALUE IF NOT EXISTS 'ODONTOLOGO';
