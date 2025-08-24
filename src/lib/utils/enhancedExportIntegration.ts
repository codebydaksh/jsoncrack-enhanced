/* eslint-disable @typescript-eslint/no-unused-vars */
import type { SchemaAnalysisResult } from "../../store/useSQLSchema";
import { DatabaseType } from "../../store/useSQLSchema";

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl?: boolean;
  connectionTimeout?: number;
}

export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
  description: string;
}

export interface CLICommand {
  command: string;
  description: string;
  example: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  format: ExportFormat;
  template: string;
  variables: string[];
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  serverVersion?: string;
  error?: string;
}

/**
 * Enhanced Export and Integration Engine
 */
export class EnhancedExportEngine {
  private static readonly EXPORT_FORMATS: Record<string, ExportFormat> = {
    sql: {
      name: "SQL Script",
      extension: "sql",
      mimeType: "text/sql",
      description: "Standard SQL DDL script",
    },
    migration: {
      name: "Migration Script",
      extension: "sql",
      mimeType: "text/sql",
      description: "Database migration script with version control",
    },
    dockerCompose: {
      name: "Docker Compose",
      extension: "yml",
      mimeType: "text/yaml",
      description: "Docker Compose file with database setup",
    },
    liquibase: {
      name: "Liquibase Changelog",
      extension: "xml",
      mimeType: "application/xml",
      description: "Liquibase XML changelog format",
    },
    flyway: {
      name: "Flyway Migration",
      extension: "sql",
      mimeType: "text/sql",
      description: "Flyway versioned migration script",
    },
    terraform: {
      name: "Terraform Configuration",
      extension: "tf",
      mimeType: "text/plain",
      description: "Terraform database resource configuration",
    },
    kubernetes: {
      name: "Kubernetes Manifest",
      extension: "yaml",
      mimeType: "text/yaml",
      description: "Kubernetes StatefulSet for database",
    },
    documentation: {
      name: "Database Documentation",
      extension: "md",
      mimeType: "text/markdown",
      description: "Comprehensive database documentation",
    },
  };

  /**
   * Export schema with advanced options
   */
  static async exportSchema(
    analysisResult: SchemaAnalysisResult,
    sql: string,
    options: {
      format: keyof typeof EnhancedExportEngine.EXPORT_FORMATS;
      databaseType: DatabaseType;
      includeData?: boolean;
      includeMigration?: boolean;
      includeDocumentation?: boolean;
      customTemplate?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    const format = this.EXPORT_FORMATS[options.format];
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");

    let content: string;

    switch (options.format) {
      case "sql":
        content = this.generateSQLExport(sql, options);
        break;
      case "migration":
        content = this.generateMigrationScript(sql, analysisResult, options);
        break;
      case "dockerCompose":
        content = this.generateDockerCompose(analysisResult, options);
        break;
      case "liquibase":
        content = this.generateLiquibaseChangelog(analysisResult, options);
        break;
      case "flyway":
        content = this.generateFlywayMigration(sql, options);
        break;
      case "terraform":
        content = this.generateTerraformConfig(analysisResult, options);
        break;
      case "kubernetes":
        content = this.generateKubernetesManifest(analysisResult, options);
        break;
      case "documentation":
        content = this.generateDocumentation(analysisResult, sql, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return {
      content,
      filename: `schema_${options.format}_${timestamp}.${format.extension}`,
      mimeType: format.mimeType,
    };
  }

  /**
   * Test database connection
   */
  static async testDatabaseConnection(
    connection: DatabaseConnection,
    databaseType: DatabaseType
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Simulate connection test (in real implementation, would use actual DB drivers)
      const testResult = await this.simulateConnectionTest(connection, databaseType);
      const latency = Date.now() - startTime;

      return {
        success: testResult.success,
        message: testResult.message,
        latency,
        serverVersion: testResult.serverVersion,
      };
    } catch (error) {
      return {
        success: false,
        message: "Connection test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate CLI commands for schema deployment
   */
  static generateCLICommands(
    analysisResult: SchemaAnalysisResult,
    databaseType: DatabaseType,
    connection?: DatabaseConnection
  ): CLICommand[] {
    const commands: CLICommand[] = [];

    const connectionString = connection
      ? this.buildConnectionString(connection, databaseType)
      : "{connection_string}";

    switch (databaseType) {
      case DatabaseType.PostgreSQL:
        commands.push(
          {
            command: `psql "${connectionString}" -f schema.sql`,
            description: "Execute schema using psql command line",
            example: 'psql "postgresql://user:password@localhost:5432/dbname" -f schema.sql',
          },
          {
            command: `pg_dump "${connectionString}" --schema-only > backup.sql`,
            description: "Backup existing schema before applying changes",
            example:
              'pg_dump "postgresql://user:password@localhost:5432/dbname" --schema-only > backup.sql',
          }
        );
        break;

      case DatabaseType.MySQL:
        commands.push(
          {
            command: `mysql -h ${connection?.host || "localhost"} -u ${connection?.username || "user"} -p ${connection?.database || "database"} < schema.sql`,
            description: "Execute schema using mysql command line",
            example: "mysql -h localhost -u root -p mydb < schema.sql",
          },
          {
            command: `mysqldump -h ${connection?.host || "localhost"} -u ${connection?.username || "user"} -p --no-data ${connection?.database || "database"} > backup.sql`,
            description: "Backup existing schema structure",
            example: "mysqldump -h localhost -u root -p --no-data mydb > backup.sql",
          }
        );
        break;

      case DatabaseType.SQLServer:
        commands.push({
          command: `sqlcmd -S ${connection?.host || "localhost"} -d ${connection?.database || "database"} -i schema.sql`,
          description: "Execute schema using sqlcmd",
          example: "sqlcmd -S localhost -d mydb -i schema.sql",
        });
        break;

      case DatabaseType.SQLite:
        commands.push({
          command: `sqlite3 ${connection?.database || "database.db"} < schema.sql`,
          description: "Execute schema on SQLite database",
          example: "sqlite3 mydb.db < schema.sql",
        });
        break;
    }

    // Add common deployment commands
    commands.push({
      command: "docker run --rm -v $(pwd):/workspace postgres:latest psql -f /workspace/schema.sql",
      description: "Execute schema using Docker container",
      example: "docker run --rm -v $(pwd):/workspace postgres:latest psql -f /workspace/schema.sql",
    });

    return commands;
  }

  /**
   * Generate API endpoint configurations
   */
  static generateAPIEndpoints(
    analysisResult: SchemaAnalysisResult,
    options: {
      framework: "express" | "fastapi" | "spring" | "django";
      includeAuth?: boolean;
      includeCRUD?: boolean;
    }
  ): { filename: string; content: string }[] {
    const endpoints: { filename: string; content: string }[] = [];

    switch (options.framework) {
      case "express":
        endpoints.push({
          filename: "routes.js",
          content: this.generateExpressRoutes(analysisResult, options),
        });
        if (options.includeAuth) {
          endpoints.push({
            filename: "auth.js",
            content: this.generateExpressAuth(),
          });
        }
        break;

      case "fastapi":
        endpoints.push({
          filename: "main.py",
          content: this.generateFastAPIRoutes(analysisResult, options),
        });
        break;

      case "spring":
        endpoints.push({
          filename: "RestController.java",
          content: this.generateSpringController(analysisResult, options),
        });
        break;

      case "django":
        endpoints.push({
          filename: "views.py",
          content: this.generateDjangoViews(analysisResult, options),
        });
        break;
    }

    return endpoints;
  }

  // Private helper methods

  private static generateSQLExport(sql: string, options: any): string {
    const header = [
      "-- SQL Schema Generated by JSON Crack Enhanced",
      `-- Database: ${options.databaseType}`,
      `-- Generated: ${new Date().toISOString()}`,
      "-- ",
      "",
    ].join("\n");

    return header + sql;
  }

  private static generateMigrationScript(
    sql: string,
    analysisResult: SchemaAnalysisResult,
    options: any
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    const version = `V${timestamp}`;

    return [
      `-- Migration: ${version}__create_schema.sql`,
      "-- Description: Initial schema creation from JSON analysis",
      `-- Tables: ${analysisResult.tables.length}`,
      `-- Generated: ${new Date().toISOString()}`,
      "",
      "BEGIN;",
      "",
      sql,
      "",
      "COMMIT;",
      "",
      `-- End of migration ${version}`,
    ].join("\n");
  }

  private static generateDockerCompose(analysisResult: SchemaAnalysisResult, options: any): string {
    const dbService = options.databaseType.toLowerCase();

    return `version: '3.8'

services:
  ${dbService}:
    image: ${this.getDockerImage(options.databaseType)}
    container_name: ${analysisResult.tables[0]?.name || "app"}_db
    environment:
      ${this.getEnvironmentVariables(options.databaseType)}
    ports:
      - "${this.getDefaultPort(options.databaseType)}:${this.getDefaultPort(options.databaseType)}"
    volumes:
      - ${dbService}_data:/var/lib/${this.getDataDir(options.databaseType)}
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    networks:
      - app_network

volumes:
  ${dbService}_data:

networks:
  app_network:
    driver: bridge`;
  }

  private static generateLiquibaseChangelog(
    analysisResult: SchemaAnalysisResult,
    options: any
  ): string {
    const changes = analysisResult.tables
      .map(
        (table, index) =>
          `    <changeSet id="${index + 1}" author="jsoncrack">
        <createTable tableName="${table.name}">
          ${table.columns
            .map(
              col =>
                `<column name="${col.name}" type="${col.type}"${col.isPrimaryKey ? ' constraints="primaryKey: true"' : ""}${!col.nullable ? ' constraints="nullable: false"' : ""}/>`
            )
            .join("\n          ")}
        </createTable>
      </changeSet>`
      )
      .join("\n\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
    http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.0.xsd">

${changes}

</databaseChangeLog>`;
  }

  private static generateFlywayMigration(sql: string, options: any): string {
    return ["-- Flyway Migration", "-- Baseline: V1.0.0", "", sql].join("\n");
  }

  private static generateTerraformConfig(
    analysisResult: SchemaAnalysisResult,
    options: any
  ): string {
    return `# Terraform configuration for database infrastructure

resource "aws_db_instance" "main" {
  identifier     = "${analysisResult.tables[0]?.name || "app"}-db"
  engine         = "${this.getTerraformEngine(options.databaseType)}"
  engine_version = "${this.getEngineVersion(options.databaseType)}"
  instance_class = "db.t3.micro"
  
  allocated_storage = 20
  storage_type     = "gp2"
  
  db_name  = var.database_name
  username = var.database_username
  password = var.database_password
  
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  
  tags = {
    Name = "${analysisResult.tables[0]?.name || "app"}-database"
  }
}`;
  }

  private static generateKubernetesManifest(
    analysisResult: SchemaAnalysisResult,
    options: any
  ): string {
    return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${options.databaseType.toLowerCase()}-db
spec:
  serviceName: ${options.databaseType.toLowerCase()}-service
  replicas: 1
  selector:
    matchLabels:
      app: ${options.databaseType.toLowerCase()}-db
  template:
    metadata:
      labels:
        app: ${options.databaseType.toLowerCase()}-db
    spec:
      containers:
      - name: ${options.databaseType.toLowerCase()}
        image: ${this.getDockerImage(options.databaseType)}
        env:
        ${this.getKubernetesEnvVars(options.databaseType)}
        ports:
        - containerPort: ${this.getDefaultPort(options.databaseType)}
        volumeMounts:
        - name: db-storage
          mountPath: /var/lib/${this.getDataDir(options.databaseType)}
  volumeClaimTemplates:
  - metadata:
      name: db-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi`;
  }

  private static generateDocumentation(
    analysisResult: SchemaAnalysisResult,
    sql: string,
    options: any
  ): string {
    const tableCount = analysisResult.tables.length;
    const columnCount = analysisResult.tables.reduce((sum, table) => sum + table.columns.length, 0);

    return `# Database Schema Documentation

## Overview
- **Database Type**: ${options.databaseType}
- **Tables**: ${tableCount}
- **Total Columns**: ${columnCount}
- **Generated**: ${new Date().toISOString()}

## Schema Summary

${analysisResult.tables
  .map(
    table => `
### Table: \`${table.name}\`

**Columns**: ${table.columns.length}

| Column | Type | Nullable | Primary Key | Foreign Key |
|--------|------|----------|-------------|-------------|
${table.columns
  .map(
    col =>
      `| \`${col.name}\` | ${col.type} | ${col.nullable ? "Yes" : "No"} | ${col.isPrimaryKey ? "Yes" : "No"} | ${col.isForeignKey ? "Yes" : "No"} |`
  )
  .join("\n")}
`
  )
  .join("\n")}

## SQL Schema

\`\`\`sql
${sql}
\`\`\`

## Deployment Instructions

### Local Development
1. Install ${options.databaseType}
2. Create database
3. Run schema file: \`${this.getExecutionCommand(options.databaseType)}\`

### Docker Deployment
\`\`\`bash
docker run -d \\
  --name app-db \\
  -e ${this.getDockerEnvExample(options.databaseType)} \\
  -p ${this.getDefaultPort(options.databaseType)}:${this.getDefaultPort(options.databaseType)} \\
  ${this.getDockerImage(options.databaseType)}
\`\`\`

## Maintenance

- **Backup**: Regular backups recommended
- **Indexing**: Monitor query performance
- **Security**: Use strong passwords and SSL connections
`;
  }

  // Helper methods for different database types
  private static getDockerImage(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "postgres:15";
      case DatabaseType.MySQL:
        return "mysql:8.0";
      case DatabaseType.SQLServer:
        return "mcr.microsoft.com/mssql/server:2022-latest";
      case DatabaseType.SQLite:
        return "alpine:latest";
      default:
        return "postgres:15";
    }
  }

  private static getDefaultPort(dbType: DatabaseType): number {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return 5432;
      case DatabaseType.MySQL:
        return 3306;
      case DatabaseType.SQLServer:
        return 1433;
      case DatabaseType.SQLite:
        return 0;
      default:
        return 5432;
    }
  }

  private static getDataDir(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "postgresql/data";
      case DatabaseType.MySQL:
        return "mysql";
      case DatabaseType.SQLServer:
        return "mssql";
      case DatabaseType.SQLite:
        return "sqlite";
      default:
        return "postgresql/data";
    }
  }

  private static getEnvironmentVariables(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "POSTGRES_DB: myapp\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: password";
      case DatabaseType.MySQL:
        return "MYSQL_DATABASE: myapp\n      MYSQL_ROOT_PASSWORD: password";
      case DatabaseType.SQLServer:
        return "SA_PASSWORD: YourStrong@Passw0rd\n      ACCEPT_EULA: Y";
      default:
        return "DATABASE_URL: sqlite:///data/database.db";
    }
  }

  private static simulateConnectionTest(
    connection: DatabaseConnection,
    databaseType: DatabaseType
  ): Promise<{ success: boolean; message: string; serverVersion?: string }> {
    // Simulate connection test with basic validation
    return new Promise(resolve => {
      setTimeout(
        () => {
          if (!connection.host || !connection.username) {
            resolve({
              success: false,
              message: "Missing required connection parameters",
            });
            return;
          }

          // Simulate successful connection
          resolve({
            success: true,
            message: "Connection successful",
            serverVersion: this.getSimulatedVersion(databaseType),
          });
        },
        1000 + Math.random() * 2000
      ); // 1-3 second delay
    });
  }

  private static getSimulatedVersion(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "PostgreSQL 15.4";
      case DatabaseType.MySQL:
        return "MySQL 8.0.34";
      case DatabaseType.SQLServer:
        return "Microsoft SQL Server 2022";
      case DatabaseType.SQLite:
        return "SQLite 3.42.0";
      default:
        return "Unknown";
    }
  }

  private static buildConnectionString(
    connection: DatabaseConnection,
    dbType: DatabaseType
  ): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return `postgresql://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
      case DatabaseType.MySQL:
        return `mysql://${connection.username}:${connection.password}@${connection.host}:${connection.port}/${connection.database}`;
      default:
        return `${connection.host}:${connection.port}/${connection.database}`;
    }
  }

  // Additional helper methods for API generation
  private static generateExpressRoutes(analysisResult: SchemaAnalysisResult, options: any): string {
    return `// Express.js routes generated from schema
const express = require('express');
const router = express.Router();

${analysisResult.tables
  .map(
    table => `
// ${table.name} routes
router.get('/${table.name.toLowerCase()}', async (req, res) => {
  // Get all ${table.name} records
});

router.get('/${table.name.toLowerCase()}/:id', async (req, res) => {
  // Get ${table.name} by ID
});

router.post('/${table.name.toLowerCase()}', async (req, res) => {
  // Create new ${table.name}
});

router.put('/${table.name.toLowerCase()}/:id', async (req, res) => {
  // Update ${table.name}
});

router.delete('/${table.name.toLowerCase()}/:id', async (req, res) => {
  // Delete ${table.name}
});`
  )
  .join("\n")}

module.exports = router;`;
  }

  private static generateExpressAuth(): string {
    return `// Express.js authentication middleware
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };`;
  }

  private static generateFastAPIRoutes(analysisResult: SchemaAnalysisResult, options: any): string {
    return `# FastAPI routes generated from schema
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

${analysisResult.tables
  .map(
    table => `
class ${table.name}(BaseModel):
${table.columns.map(col => `    ${col.name}: ${this.getPythonType(col.type)}`).join("\n")}

@app.get("/${table.name.toLowerCase()}/", response_model=List[${table.name}])
async def get_${table.name.toLowerCase()}():
    """Get all ${table.name} records"""
    pass

@app.get("/${table.name.toLowerCase()}/{item_id}", response_model=${table.name})
async def get_${table.name.toLowerCase()}(item_id: int):
    """Get ${table.name} by ID"""
    pass

@app.post("/${table.name.toLowerCase()}/", response_model=${table.name})
async def create_${table.name.toLowerCase()}(item: ${table.name}):
    """Create new ${table.name}"""
    pass`
  )
  .join("\n")}`;
  }

  private static generateSpringController(
    analysisResult: SchemaAnalysisResult,
    options: any
  ): string {
    return `// Spring Boot REST Controller generated from schema
package com.example.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
public class GeneratedController {

${analysisResult.tables
  .map(
    table => `
    @GetMapping("/${table.name.toLowerCase()}")
    public List<${table.name}> getAll${table.name}() {
        // Implementation needed
        return null;
    }

    @GetMapping("/${table.name.toLowerCase()}/{id}")
    public ${table.name} get${table.name}(@PathVariable Long id) {
        // Implementation needed
        return null;
    }

    @PostMapping("/${table.name.toLowerCase()}")
    public ${table.name} create${table.name}(@RequestBody ${table.name} entity) {
        // Implementation needed
        return null;
    }`
  )
  .join("\n")}
}`;
  }

  private static generateDjangoViews(analysisResult: SchemaAnalysisResult, options: any): string {
    return `# Django views generated from schema
from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

${analysisResult.tables
  .map(
    table => `
@method_decorator(csrf_exempt, name='dispatch')
class ${table.name}View(View):
    def get(self, request, id=None):
        if id:
            # Get single ${table.name}
            pass
        else:
            # Get all ${table.name} records
            pass
    
    def post(self, request):
        # Create new ${table.name}
        pass
    
    def put(self, request, id):
        # Update ${table.name}
        pass
    
    def delete(self, request, id):
        # Delete ${table.name}
        pass`
  )
  .join("\n")}`;
  }

  private static getPythonType(sqlType: string): string {
    if (sqlType.includes("INT")) return "int";
    if (sqlType.includes("VARCHAR") || sqlType.includes("TEXT")) return "str";
    if (sqlType.includes("BOOLEAN")) return "bool";
    if (sqlType.includes("DECIMAL") || sqlType.includes("FLOAT")) return "float";
    if (sqlType.includes("TIMESTAMP") || sqlType.includes("DATE")) return "datetime";
    return "str";
  }

  private static getTerraformEngine(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "postgres";
      case DatabaseType.MySQL:
        return "mysql";
      case DatabaseType.SQLServer:
        return "sqlserver-se";
      default:
        return "postgres";
    }
  }

  private static getEngineVersion(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "15.4";
      case DatabaseType.MySQL:
        return "8.0";
      case DatabaseType.SQLServer:
        return "15.00";
      default:
        return "15.4";
    }
  }

  private static getKubernetesEnvVars(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return `        - name: POSTGRES_DB
          value: "myapp"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password`;
      case DatabaseType.MySQL:
        return `        - name: MYSQL_DATABASE
          value: "myapp"
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password`;
      default:
        return `        - name: DATABASE_URL
          value: "sqlite:///data/database.db"`;
    }
  }

  private static getExecutionCommand(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "psql -d myapp -f schema.sql";
      case DatabaseType.MySQL:
        return "mysql -u root -p myapp < schema.sql";
      case DatabaseType.SQLServer:
        return "sqlcmd -d myapp -i schema.sql";
      case DatabaseType.SQLite:
        return "sqlite3 myapp.db < schema.sql";
      default:
        return "psql -d myapp -f schema.sql";
    }
  }

  private static getDockerEnvExample(dbType: DatabaseType): string {
    switch (dbType) {
      case DatabaseType.PostgreSQL:
        return "POSTGRES_PASSWORD=password";
      case DatabaseType.MySQL:
        return "MYSQL_ROOT_PASSWORD=password";
      case DatabaseType.SQLServer:
        return "SA_PASSWORD=YourStrong@Passw0rd -e ACCEPT_EULA=Y";
      default:
        return "POSTGRES_PASSWORD=password";
    }
  }
}
