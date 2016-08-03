import { EntityType } from './entityType';

/**
 * Given a set of type definitions, the `entityTypeAccessors` factory instantiates
 * a new set of EntityType instances, bundled together in an object with the same
 * top-level keys as your `typedefs`.
 *
 * Specify entity types as top-level keys in `typedefs`. You will need to specify
 * the primary key of your type, as well as declare any foreign or inverse foreign
 * key relationships you would like to leverage.
 *
 * Keys are expressed as lists of strings, appropriate for the `getIn` method
 * of `Immutable.Map`s.
 *
 *   let typedefs = {
 *      AdAccount: {
 *        key: ['id'],
 *        foreignKeys: {},
 *        inverseForeignKeys: {
 *          AdCampaign: ['account_id']
 *        }
 *      },
 *      AdCampaign: {
 *        key: ['id'],
 *        foreignKeys: {
 *          AdAccount: ['account_id']
 *        },
 *        inverseForeignKeys: {
 *          Ad: ['campaign_id']
 *        }
 *      },
 *      Ad: {
 *        key: ['id'],
 *        foreignKeys: {
 *          AdCampaign: ['campaign_id']
 *        },
 *        inverseForeignKeys: {}
 *      }
 *    };
 *
 * @param  {Object} typedefs - Your type declarations.
 * At the top level, keys are entity type names, and values are that entity's typedef.
 * A typedef requires:
 * - key: This type's primary key.
 * - foreignKeys: Related entity names are keys, values are the foreign key on this entity.
 * - inverseForeignKeys: Related entity names are keys, values are the foreign key on that entity.
 * @return {Object<String, EntityType>} - A collection of entity type accessors in a POJO.
 * Keys correspond to your typedef
 */
export function entityTypeAccessors(typedefs) {
  let accessors = {};
  Object.keys(typedefs).forEach(name => {
    accessors[name] = new EntityType(accessors, name, typedefs[name]);
  });
  return accessors;
}
