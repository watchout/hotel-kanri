/**
 * @fileoverview ESLint rule to enforce the use of Prisma adapters instead of direct PrismaClient usage
 * @author hotel-kanri
 */

"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce the use of Prisma adapters instead of direct PrismaClient usage",
      category: "Best Practices",
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noPrismaClientImport: "Direct import of PrismaClient is not allowed. Use an adapter layer instead.",
      noPrismaClientUsage: "Direct usage of PrismaClient is not allowed. Use an adapter layer instead.",
      useAdapterInstead: "Use the appropriate adapter (e.g., UserAdapter, ReservationAdapter) instead of direct Prisma operations."
    }
  },

  create(context) {
    // Allowed paths for PrismaClient import
    const allowedPaths = [
      /adapters\/prisma\.adapter\.ts$/,  // Base adapter
      /adapters\/index\.ts$/,            // Adapter index
      /scripts\/.*\.ts$/,                // Scripts
      /prisma\/seed\.ts$/,               // Seed scripts
      /prisma\/.*\.ts$/,                 // Other Prisma-related scripts
      /tests\/.*\.ts$/                   // Test files
    ];

    // Check if the current file is allowed to use PrismaClient directly
    function isAllowedFile(filePath) {
      return allowedPaths.some(pattern => pattern.test(filePath));
    }

    return {
      // Check for PrismaClient imports
      ImportDeclaration(node) {
        const filePath = context.getFilename();
        
        // Skip check for allowed files
        if (isAllowedFile(filePath)) {
          return;
        }

        // Check if importing PrismaClient from @prisma/client
        if (
          node.source.value === '@prisma/client' && 
          node.specifiers.some(specifier => 
            specifier.type === 'ImportSpecifier' && 
            specifier.imported.name === 'PrismaClient'
          )
        ) {
          context.report({
            node,
            messageId: "noPrismaClientImport"
          });
        }
      },

      // Check for PrismaClient instantiation
      NewExpression(node) {
        const filePath = context.getFilename();
        
        // Skip check for allowed files
        if (isAllowedFile(filePath)) {
          return;
        }

        // Check if instantiating PrismaClient
        if (
          node.callee.type === 'Identifier' && 
          node.callee.name === 'PrismaClient'
        ) {
          context.report({
            node,
            messageId: "noPrismaClientUsage"
          });
        }
      },

      // Check for direct Prisma operations
      MemberExpression(node) {
        const filePath = context.getFilename();
        
        // Skip check for allowed files
        if (isAllowedFile(filePath)) {
          return;
        }

        // Check for patterns like prisma.user.findMany(), prisma.reservation.create(), etc.
        if (
          node.object && 
          node.object.type === 'MemberExpression' && 
          node.object.object && 
          node.object.object.type === 'Identifier' && 
          node.object.object.name === 'prisma' && 
          !node.object.property.name.startsWith('$') && // Allow prisma.$transaction, prisma.$connect, etc.
          node.parent && 
          node.parent.type === 'CallExpression'
        ) {
          // Get the model name and operation
          const modelName = node.object.property.name;
          const operation = node.property.name;
          
          // Only report if this is a data operation (not a utility method)
          const dataOperations = ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'delete', 'upsert', 'count'];
          if (dataOperations.includes(operation)) {
            context.report({
              node: node.parent,
              messageId: "useAdapterInstead",
              data: {
                model: modelName,
                operation: operation
              }
            });
          }
        }
      }
    };
  },
};



