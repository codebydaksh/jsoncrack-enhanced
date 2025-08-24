import { 
  SchemaAnalysisResult, 
  TableSchema, 
  ColumnSchema, 
  ForeignKeySchema, 
  IndexSchema,
  RelationshipInfo,
  SQLSchemaConfig,
  DatabaseType 
} from "../../store/useSQLSchema";

/**
 * Multi-database SQL schema generation engine
 * Supports PostgreSQL, MySQL, SQL Server, and SQLite
 */

export interface DatabaseDialect {
  name: string;
  quotingChar: string;
  escapeChar: string;
  supportsUUID: boolean;
  supportsJSON: boolean;
  supportsCheck: boolean;
  supportsPartialIndexes: boolean;
  supportsComments: boolean;
  autoIncrementSyntax: string;
  dataTypeMappings: Map<string, string>;
}

/**
 * Database dialect configurations
 */
const DIALECTS: Record<DatabaseType, DatabaseDialect> = {
  [DatabaseType.PostgreSQL]: {
    name: "PostgreSQL",
    quotingChar: '"',
    escapeChar: '"',
    supportsUUID: true,
    supportsJSON: true,
    supportsCheck: true,
    supportsPartialIndexes: true,
    supportsComments: true,
    autoIncrementSyntax: "SERIAL",
    dataTypeMappings: new Map([
      ["VARCHAR(50)", "VARCHAR(50)"],
      ["VARCHAR(100)", "VARCHAR(100)"],
      ["VARCHAR(255)", "VARCHAR(255)"],
      ["VARCHAR(500)", "VARCHAR(500)"],
      ["VARCHAR(1000)", "VARCHAR(1000)"],
      ["TEXT", "TEXT"],
      ["INTEGER", "INTEGER"],
      ["BIGINT", "BIGINT"],
      ["SMALLINT", "SMALLINT"],
      ["DECIMAL(10,2)", "DECIMAL(10,2)"],
      ["DECIMAL(15,2)", "DECIMAL(15,2)"],
      ["DECIMAL(15,4)", "DECIMAL(15,4)"],
      ["DECIMAL(20,8)", "DECIMAL(20,8)"],
      ["DOUBLE PRECISION", "DOUBLE PRECISION"],
      ["BOOLEAN", "BOOLEAN"],
      ["DATE", "DATE"],
      ["TIME", "TIME"],
      ["TIMESTAMP", "TIMESTAMP"],
      ["UUID", "UUID"],
      ["JSON", "JSON"],
      ["INET", "INET"],
      ["SERIAL", "SERIAL"]
    ])
  },
  
  [DatabaseType.MySQL]: {
    name: "MySQL",
    quotingChar: "`",
    escapeChar: "`",
    supportsUUID: false,
    supportsJSON: true,
    supportsCheck: true,
    supportsPartialIndexes: false,
    supportsComments: true,
    autoIncrementSyntax: "AUTO_INCREMENT",
    dataTypeMappings: new Map([
      ["VARCHAR(50)", "VARCHAR(50)"],
      ["VARCHAR(100)", "VARCHAR(100)"],
      ["VARCHAR(255)", "VARCHAR(255)"],
      ["VARCHAR(500)", "VARCHAR(500)"],
      ["VARCHAR(1000)", "VARCHAR(1000)"],
      ["TEXT", "TEXT"],
      ["INTEGER", "INT"],
      ["BIGINT", "BIGINT"],
      ["SMALLINT", "SMALLINT"],
      ["DECIMAL(10,2)", "DECIMAL(10,2)"],
      ["DECIMAL(15,2)", "DECIMAL(15,2)"],
      ["DECIMAL(15,4)", "DECIMAL(15,4)"],
      ["DECIMAL(20,8)", "DECIMAL(20,8)"],
      ["DOUBLE PRECISION", "DOUBLE"],
      ["BOOLEAN", "BOOLEAN"],
      ["DATE", "DATE"],
      ["TIME", "TIME"],
      ["TIMESTAMP", "TIMESTAMP"],
      ["UUID", "CHAR(36)"],
      ["JSON", "JSON"],
      ["INET", "VARCHAR(45)"],
      ["SERIAL", "INT AUTO_INCREMENT"]
    ])
  },
  
  [DatabaseType.SQLServer]: {
    name: "SQL Server",
    quotingChar: "[",
    escapeChar: "]",
    supportsUUID: true,
    supportsJSON: false,
    supportsCheck: true,
    supportsPartialIndexes: true,
    supportsComments: false,
    autoIncrementSyntax: "IDENTITY(1,1)",
    dataTypeMappings: new Map([
      ["VARCHAR(50)", "NVARCHAR(50)"],
      ["VARCHAR(100)", "NVARCHAR(100)"],
      ["VARCHAR(255)", "NVARCHAR(255)"],
      ["VARCHAR(500)", "NVARCHAR(500)"],
      ["VARCHAR(1000)", "NVARCHAR(1000)"],
      ["TEXT", "NVARCHAR(MAX)"],
      ["INTEGER", "INT"],
      ["BIGINT", "BIGINT"],
      ["SMALLINT", "SMALLINT"],
      ["DECIMAL(10,2)", "DECIMAL(10,2)"],
      ["DECIMAL(15,2)", "DECIMAL(15,2)"],
      ["DECIMAL(15,4)", "DECIMAL(15,4)"],
      ["DECIMAL(20,8)", "DECIMAL(20,8)"],
      ["DOUBLE PRECISION", "FLOAT"],
      ["BOOLEAN", "BIT"],
      ["DATE", "DATE"],
      ["TIME", "TIME"],
      ["TIMESTAMP", "DATETIME2"],
      ["UUID", "UNIQUEIDENTIFIER"],
      ["JSON", "NVARCHAR(MAX)"],
      ["INET", "NVARCHAR(45)"],
      ["SERIAL", "INT IDENTITY(1,1)"]
    ])
  },
  
  [DatabaseType.SQLite]: {
    name: "SQLite",
    quotingChar: '"',
    escapeChar: '"',
    supportsUUID: false,
    supportsJSON: true,
    supportsCheck: true,
    supportsPartialIndexes: true,
    supportsComments: false,
    autoIncrementSyntax: "AUTOINCREMENT",
    dataTypeMappings: new Map([
      ["VARCHAR(50)", "TEXT"],
      ["VARCHAR(100)", "TEXT"],
      ["VARCHAR(255)", "TEXT"],
      ["VARCHAR(500)", "TEXT"],
      ["VARCHAR(1000)", "TEXT"],
      ["TEXT", "TEXT"],
      ["INTEGER", "INTEGER"],
      ["BIGINT", "INTEGER"],
      ["SMALLINT", "INTEGER"],
      ["DECIMAL(10,2)", "REAL"],
      ["DECIMAL(15,2)", "REAL"],
      ["DECIMAL(15,4)", "REAL"],
      ["DECIMAL(20,8)", "REAL"],
      ["DOUBLE PRECISION", "REAL"],
      ["BOOLEAN", "INTEGER"],
      ["DATE", "TEXT"],
      ["TIME", "TEXT"],
      ["TIMESTAMP", "TEXT"],
      ["UUID", "TEXT"],
      ["JSON", "TEXT"],
      ["INET", "TEXT"],
      ["SERIAL", "INTEGER PRIMARY KEY AUTOINCREMENT"]
    ])
  }
};

/**
 * Main function to generate SQL schema
 */
export async function generateSQLSchema(
  analysisResult: SchemaAnalysisResult,
  config: SQLSchemaConfig
): Promise<string> {
  const dialect = DIALECTS[config.databaseType];
  const generator = new SQLGenerator(dialect, config);
  
  let sql = "";
  
  // Add header comment
  sql += generator.generateHeader();
  
  // Generate table creation statements
  for (const table of analysisResult.tables) {
    sql += generator.generateCreateTable(table);
    sql += "\n\n";
  }
  
  // Generate foreign key constraints (if not inline)
  if (config.includeForeignKeys) {
    const foreignKeys = generator.generateForeignKeyConstraints(
      analysisResult.tables, 
      analysisResult.relationships
    );
    if (foreignKeys.trim()) {
      sql += "-- Foreign Key Constraints\n";
      sql += foreignKeys;
      sql += "\n\n";
    }
  }
  
  // Generate indexes
  if (config.includeIndexes) {
    const indexes = generator.generateIndexes(analysisResult.tables, analysisResult.relationships);
    if (indexes.trim()) {
      sql += "-- Indexes\n";
      sql += indexes;
      sql += "\n\n";
    }
  }
  
  // Generate migration data (if enabled)
  if (config.generateMigration && analysisResult.migrationScript) {
    sql += "-- Sample Data Migration\n";
    sql += "-- Note: Uncomment and modify as needed\n";
    sql += analysisResult.migrationScript.split('\n')
      .map(line => `-- ${line}`)
      .join('\n');
    sql += "\n\n";
  }
  
  // Add footer with recommendations
  if (analysisResult.recommendations.length > 0) {
    sql += generator.generateRecommendations(analysisResult.recommendations);
  }
  
  return sql.trim();
}

/**
 * SQL Generator class for database-specific SQL generation
 */
class SQLGenerator {
  constructor(
    private dialect: DatabaseDialect,
    private config: SQLSchemaConfig
  ) {}

  generateHeader(): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `-- SQL Schema generated by JSON Crack Enhanced
-- Database: ${this.dialect.name}
-- Generated on: ${timestamp}
-- Normalization Level: ${this.config.normalizationLevel}
-- Naming Convention: ${this.config.namingConvention}

`;
  }

  generateCreateTable(table: TableSchema): string {
    const tableName = this.quoteIdentifier(table.name);
    let sql = `CREATE TABLE ${tableName} (\n`;
    
    // Generate column definitions
    const columnDefs = table.columns.map(column => this.generateColumnDefinition(column));
    sql += columnDefs.map(def => `  ${def}`).join(',\n');
    
    // Add primary key constraint
    if (table.primaryKey && !this.isSerialColumn(table.primaryKey, table.columns)) {
      sql += `,\n  PRIMARY KEY (${this.quoteIdentifier(table.primaryKey)})`;
    }
    
    // Add unique constraints
    const uniqueColumns = table.columns.filter(col => 
      col.constraints?.includes("UNIQUE") && !col.isPrimaryKey
    );
    for (const col of uniqueColumns) {
      sql += `,\n  UNIQUE (${this.quoteIdentifier(col.name)})`;
    }
    
    // Add check constraints (if supported)
    if (this.dialect.supportsCheck && this.config.includeConstraints) {
      const checkConstraints = this.generateCheckConstraints(table.columns);
      for (const constraint of checkConstraints) {
        sql += `,\n  ${constraint}`;
      }
    }
    
    sql += '\n)';
    
    // Add table options (database-specific)
    sql += this.generateTableOptions();
    
    sql += ';';
    
    // Add table comments (if supported)
    if (this.dialect.supportsComments) {
      sql += this.generateTableComment(table);
    }
    
    return sql;
  }

  generateColumnDefinition(column: ColumnSchema): string {
    const colName = this.quoteIdentifier(column.name);
    const dataType = this.mapDataType(column.type);
    
    let def = `${colName} ${dataType}`;
    
    // Handle SERIAL/AUTO_INCREMENT columns
    if (column.isPrimaryKey && this.isAutoIncrementType(column.type)) {
      if (this.config.databaseType === DatabaseType.PostgreSQL) {
        def = `${colName} SERIAL PRIMARY KEY`;
      } else if (this.config.databaseType === DatabaseType.MySQL) {
        def = `${colName} INT AUTO_INCREMENT PRIMARY KEY`;
      } else if (this.config.databaseType === DatabaseType.SQLServer) {
        def = `${colName} INT IDENTITY(1,1) PRIMARY KEY`;
      } else if (this.config.databaseType === DatabaseType.SQLite) {
        def = `${colName} INTEGER PRIMARY KEY AUTOINCREMENT`;
      }
      return def;
    }
    
    // Add NOT NULL constraint
    if (!column.nullable) {
      def += ' NOT NULL';
    }
    
    // Add default value
    if (column.defaultValue) {
      def += ` DEFAULT ${this.formatDefaultValue(column.defaultValue, column.type)}`;
    }
    
    return def;
  }

  mapDataType(sqlType: string): string {
    return this.dialect.dataTypeMappings.get(sqlType) || sqlType;
  }

  generateCheckConstraints(columns: ColumnSchema[]): string[] {
    const constraints: string[] = [];
    
    for (const column of columns) {
      if (column.constraints) {
        for (const constraint of column.constraints) {
          if (constraint.startsWith("CHECK")) {
            const constraintName = `chk_${column.name}`;
            const constraintSQL = constraint.replace("value", this.quoteIdentifier(column.name));
            constraints.push(`CONSTRAINT ${this.quoteIdentifier(constraintName)} ${constraintSQL}`);
          }
        }
      }
    }
    
    return constraints;
  }

  generateForeignKeyConstraints(tables: TableSchema[], relationships: RelationshipInfo[]): string {
    let sql = "";
    
    for (const rel of relationships) {
      const sourceTable = this.quoteIdentifier(rel.sourceTable);
      const targetTable = this.quoteIdentifier(rel.targetTable);
      const fkColumn = this.quoteIdentifier(rel.foreignKeyColumn);
      
      // Find target table's primary key
      const targetTableSchema = tables.find(t => t.name === rel.targetTable);
      const targetPK = targetTableSchema?.primaryKey || "id";
      
      const constraintName = `fk_${rel.sourceTable}_${rel.targetTable}`;
      
      sql += `ALTER TABLE ${sourceTable}\n`;
      sql += `  ADD CONSTRAINT ${this.quoteIdentifier(constraintName)}\n`;
      sql += `  FOREIGN KEY (${fkColumn})\n`;
      sql += `  REFERENCES ${targetTable} (${this.quoteIdentifier(targetPK)})`;
      
      if (rel.onDelete) {
        sql += `\n  ON DELETE ${rel.onDelete}`;
      }
      
      if (rel.onUpdate) {
        sql += `\n  ON UPDATE ${rel.onUpdate}`;
      }
      
      sql += ";\n\n";
    }
    
    return sql;
  }

  generateIndexes(tables: TableSchema[], relationships: RelationshipInfo[]): string {
    let sql = "";
    
    for (const table of tables) {
      // Index foreign key columns
      const fkColumns = table.columns.filter(col => col.isForeignKey);
      for (const col of fkColumns) {
        const indexName = `idx_${table.name}_${col.name}`;
        sql += this.generateCreateIndex(indexName, table.name, [col.name], false);
        sql += "\n";
      }
      
      // Index unique columns (non-primary key)
      const uniqueColumns = table.columns.filter(col => 
        col.constraints?.includes("UNIQUE") && !col.isPrimaryKey
      );
      for (const col of uniqueColumns) {
        const indexName = `idx_${table.name}_${col.name}_unique`;
        sql += this.generateCreateIndex(indexName, table.name, [col.name], true);
        sql += "\n";
      }
      
      // Add custom indexes from table schema
      if (table.indexes) {
        for (const index of table.indexes) {
          sql += this.generateCreateIndex(index.name, table.name, index.columns, index.unique);
          sql += "\n";
        }
      }
    }
    
    return sql;
  }

  generateCreateIndex(name: string, tableName: string, columns: string[], unique: boolean): string {
    const indexName = this.quoteIdentifier(name);
    const table = this.quoteIdentifier(tableName);
    const cols = columns.map(col => this.quoteIdentifier(col)).join(', ');
    
    const uniqueKeyword = unique ? "UNIQUE " : "";
    
    return `CREATE ${uniqueKeyword}INDEX ${indexName} ON ${table} (${cols});`;
  }

  generateTableOptions(): string {
    switch (this.config.databaseType) {
      case DatabaseType.MySQL:
        return " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
      
      case DatabaseType.SQLServer:
        return "";
      
      case DatabaseType.PostgreSQL:
        return "";
      
      case DatabaseType.SQLite:
        return "";
      
      default:
        return "";
    }
  }

  generateTableComment(table: TableSchema): string {
    if (!this.dialect.supportsComments) return "";
    
    const tableName = this.quoteIdentifier(table.name);
    const comment = `Generated from JSON structure analysis`;
    
    switch (this.config.databaseType) {
      case DatabaseType.PostgreSQL:
        return `\nCOMMENT ON TABLE ${tableName} IS '${comment}';`;
      
      case DatabaseType.MySQL:
        return `; -- ${comment}`;
      
      default:
        return "";
    }
  }

  generateRecommendations(recommendations: any[]): string {
    let sql = "-- Schema Recommendations\n";
    sql += "-- The following are suggestions for optimization:\n\n";
    
    for (const rec of recommendations) {
      sql += `-- [${rec.severity}] ${rec.type}: ${rec.message}\n`;
      sql += `-- Suggested Action: ${rec.suggestedAction}\n`;
      sql += `-- Impact: ${rec.impact}\n\n`;
    }
    
    return sql;
  }

  quoteIdentifier(identifier: string): string {
    const quote = this.dialect.quotingChar;
    const escape = this.dialect.escapeChar;
    
    // Escape quotes in identifier
    const escaped = identifier.replace(new RegExp(quote, 'g'), escape + quote);
    
    // For SQL Server, handle both opening and closing brackets
    if (this.config.databaseType === DatabaseType.SQLServer) {
      return `[${escaped}]`;
    }
    
    return `${quote}${escaped}${quote}`;
  }

  formatDefaultValue(value: string, dataType: string): string {
    // Handle string literals
    if (dataType.includes("VARCHAR") || dataType.includes("TEXT") || dataType.includes("CHAR")) {
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    // Handle numeric values
    if (dataType.includes("INT") || dataType.includes("DECIMAL") || dataType.includes("REAL")) {
      return value;
    }
    
    // Handle boolean values
    if (dataType.includes("BOOLEAN") || dataType.includes("BIT")) {
      if (this.config.databaseType === DatabaseType.SQLServer) {
        return value.toLowerCase() === "true" ? "1" : "0";
      }
      if (this.config.databaseType === DatabaseType.SQLite) {
        return value.toLowerCase() === "true" ? "1" : "0";
      }
      return value.toLowerCase() === "true" ? "TRUE" : "FALSE";
    }
    
    // Handle NULL
    if (value.toUpperCase() === "NULL") {
      return "NULL";
    }
    
    // Default to quoted string
    return `'${value.replace(/'/g, "''")}'`;
  }

  isSerialColumn(columnName: string, columns: ColumnSchema[]): boolean {
    const column = columns.find(col => col.name === columnName);
    return column ? this.isAutoIncrementType(column.type) : false;
  }

  isAutoIncrementType(dataType: string): boolean {
    return dataType.includes("SERIAL") || dataType.includes("IDENTITY") || dataType.includes("AUTOINCREMENT");
  }
}

/**
 * Validates generated SQL for syntax errors
 */
export async function validateGeneratedSQL(sql: string, databaseType: DatabaseType): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Basic syntax validation
    const lines = sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--'));
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for missing semicolons on statements
      if (line.startsWith('CREATE') || line.startsWith('ALTER') || line.startsWith('INSERT')) {
        if (!line.endsWith(';') && i < lines.length - 1) {
          const nextLine = lines[i + 1]?.trim();
          if (!nextLine?.endsWith(';')) {
            warnings.push(`Line ${i + 1}: Statement may be missing semicolon`);
          }
        }
      }
      
      // Check for reserved words
      const reservedWords = getReservedWords(databaseType);
      const words = line.split(/\s+/);
      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '').toUpperCase();
        if (reservedWords.includes(cleanWord)) {
          warnings.push(`Line ${i + 1}: '${cleanWord}' is a reserved word, consider quoting`);
        }
      }
    }
    
    // Check for database-specific issues
    validateDatabaseSpecificSyntax(sql, databaseType, errors, warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { isValid: false, errors, warnings };
  }
}

function getReservedWords(databaseType: DatabaseType): string[] {
  const common = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'INDEX', 'TABLE', 'COLUMN', 'ORDER', 'GROUP', 'BY', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE'];
  
  switch (databaseType) {
    case DatabaseType.PostgreSQL:
      return [...common, 'SERIAL', 'TIMESTAMP', 'UUID', 'JSON', 'INET'];
    case DatabaseType.MySQL:
      return [...common, 'AUTO_INCREMENT', 'ENGINE', 'CHARSET', 'COLLATE'];
    case DatabaseType.SQLServer:
      return [...common, 'IDENTITY', 'NVARCHAR', 'UNIQUEIDENTIFIER', 'DATETIME2'];
    case DatabaseType.SQLite:
      return [...common, 'AUTOINCREMENT', 'INTEGER'];
    default:
      return common;
  }
}

function validateDatabaseSpecificSyntax(
  sql: string, 
  databaseType: DatabaseType, 
  errors: string[], 
  warnings: string[]
): void {
  switch (databaseType) {
    case DatabaseType.PostgreSQL:
      // Check for UUID usage without extension
      if (sql.includes('UUID') && !sql.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')) {
        warnings.push('UUID type used but uuid-ossp extension not enabled');
      }
      break;
      
    case DatabaseType.MySQL:
      // Check for storage engine specification
      if (sql.includes('CREATE TABLE') && !sql.includes('ENGINE=')) {
        warnings.push('No storage engine specified, defaulting to InnoDB');
      }
      break;
      
    case DatabaseType.SQLServer:
      // Check for NVARCHAR usage for Unicode support
      if (sql.includes('VARCHAR(') && !sql.includes('NVARCHAR(')) {
        warnings.push('Consider using NVARCHAR for Unicode support');
      }
      break;
      
    case DatabaseType.SQLite:
      // Check for foreign key support
      if (sql.includes('FOREIGN KEY') && !sql.includes('PRAGMA foreign_keys=ON')) {
        warnings.push('Foreign key constraints require PRAGMA foreign_keys=ON');
      }
      break;
  }
}