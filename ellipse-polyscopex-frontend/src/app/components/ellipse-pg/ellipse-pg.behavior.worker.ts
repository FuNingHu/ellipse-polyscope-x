/// <reference lib="webworker" />
import {
    InsertionContext,
    OptionalPromise,
    ProgramBehaviors,
    ProgramNode,
    registerProgramBehavior,
    ScriptBuilder,
    ValidationContext,
    ValidationResponse
} from '@universal-robots/contribution-api';
import { EllipsePgNode, waypoint_empty } from './ellipse-pg.node';

// programNodeLabel is required
const createProgramNodeLabel = (node: EllipsePgNode): OptionalPromise<string> => 'Ellipse Program';

// factory is required
const createProgramNode = (): OptionalPromise<EllipsePgNode> => ({
    type: 'funh-ellipse-polyscopex-ellipse-pg',
    version: '1.0.0',
    lockChildren: false,
    allowsChildren: false,
    parameters: {
        waypoint: waypoint_empty,
        isDefined: false,
    },
});

// generateCodeBeforeChildren is optional
const generateScriptCodeBefore = (node: EllipsePgNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodeAfterChildren is optional
const generateScriptCodeAfter = (node: EllipsePgNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodePreamble is optional
const generatePreambleScriptCode = (node: EllipsePgNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// validator is optional
const validate = (node: EllipsePgNode, validationContext: ValidationContext): OptionalPromise<ValidationResponse> => ({
    isValid: node.parameters.waypoint.pose.position[0]!==0
});

// allowsChild is optional
const allowChildInsert = (node: ProgramNode, childType: string): OptionalPromise<boolean> => true;

// allowedInContext is optional
const allowedInsert = (insertionContext: InsertionContext): OptionalPromise<boolean> => true;

// upgradeNode is optional
const nodeUpgrade = (loadedNode: ProgramNode): ProgramNode => loadedNode;

const behaviors: ProgramBehaviors = {
    programNodeLabel: createProgramNodeLabel,
    factory: createProgramNode,
    generateCodeBeforeChildren: generateScriptCodeBefore,
    generateCodeAfterChildren: generateScriptCodeAfter,
    generateCodePreamble: generatePreambleScriptCode,
    validator: validate,
    allowsChild: allowChildInsert,
    allowedInContext: allowedInsert,
    upgradeNode: nodeUpgrade
};

registerProgramBehavior(behaviors);
